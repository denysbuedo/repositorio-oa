import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Collection } from '../collections/entities/collection.entity';
import {
  LearningObject,
  ObjectStatus,
} from '../learning-objects/entities/learning-object.entity';

type OaiRequest = {
  verb?: string;
  identifier?: string;
  metadataPrefix?: string;
  set?: string;
};

type LomMetadata = {
  general?: {
    language?: string;
    keyword?: string[];
  };
  educational?: {
    learningResourceType?: string;
  };
  rights?: {
    license?: string;
  };
};

const OAI_DATE_FORMAT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;

@Injectable()
export class OaiService {
  constructor(
    @InjectRepository(LearningObject)
    private readonly learningObjectRepository: Repository<LearningObject>,
    @InjectRepository(Collection)
    private readonly collectionRepository: Repository<Collection>,
  ) {}

  async handle(request: OaiRequest): Promise<string> {
    const verb = request.verb;

    if (!verb) {
      return this.wrapResponse('', errorXml('badVerb', 'Missing verb'));
    }

    switch (verb) {
      case 'Identify':
        return this.identify();
      case 'ListMetadataFormats':
        return this.listMetadataFormats();
      case 'ListSets':
        return this.listSets();
      case 'ListIdentifiers':
        return this.listIdentifiers(request);
      case 'ListRecords':
        return this.listRecords(request);
      case 'GetRecord':
        return this.getRecord(request);
      default:
        return this.wrapResponse('', errorXml('badVerb', 'Unsupported verb'));
    }
  }

  private identify() {
    const body = `
      <Identify>
        <repositoryName>${xmlEscape(getRepositoryName())}</repositoryName>
        <baseURL>${xmlEscape(getOaiBaseUrl())}</baseURL>
        <protocolVersion>2.0</protocolVersion>
        <adminEmail>${xmlEscape(getAdminEmail())}</adminEmail>
        <earliestDatestamp>${xmlEscape(formatOaiDate(new Date(0)))}</earliestDatestamp>
        <deletedRecord>no</deletedRecord>
        <granularity>YYYY-MM-DDThh:mm:ssZ</granularity>
      </Identify>
    `;
    return this.wrapResponse('verb="Identify"', body);
  }

  private listMetadataFormats() {
    const body = `
      <ListMetadataFormats>
        <metadataFormat>
          <metadataPrefix>oai_dc</metadataPrefix>
          <schema>http://www.openarchives.org/OAI/2.0/oai_dc.xsd</schema>
          <metadataNamespace>http://www.openarchives.org/OAI/2.0/oai_dc/</metadataNamespace>
        </metadataFormat>
      </ListMetadataFormats>
    `;
    return this.wrapResponse('verb="ListMetadataFormats"', body);
  }

  private async listSets() {
    const collections = await this.collectionRepository.find({
      order: { name: 'ASC' },
    });

    if (collections.length === 0) {
      return this.wrapResponse(
        'verb="ListSets"',
        errorXml('noSetHierarchy', 'No sets are available'),
      );
    }

    const sets = collections
      .map(
        (collection) => `
          <set>
            <setSpec>${xmlEscape(collection.id)}</setSpec>
            <setName>${xmlEscape(collection.name)}</setName>
          </set>
        `,
      )
      .join('');

    return this.wrapResponse('verb="ListSets"', `<ListSets>${sets}</ListSets>`);
  }

  private async listIdentifiers(request: OaiRequest) {
    const error = validateMetadataPrefix(request.metadataPrefix);
    if (error) return this.wrapResponse('verb="ListIdentifiers"', error);

    const objects = await this.findPublishedObjects(request.set);
    if (objects.length === 0) {
      return this.wrapResponse(
        'verb="ListIdentifiers"',
        errorXml('noRecordsMatch', 'No records match the request'),
      );
    }

    const headers = objects.map((object) => this.headerXml(object)).join('');
    return this.wrapResponse(
      requestAttribute('ListIdentifiers', request),
      `<ListIdentifiers>${headers}</ListIdentifiers>`,
    );
  }

  private async listRecords(request: OaiRequest) {
    const error = validateMetadataPrefix(request.metadataPrefix);
    if (error) return this.wrapResponse('verb="ListRecords"', error);

    const objects = await this.findPublishedObjects(request.set);
    if (objects.length === 0) {
      return this.wrapResponse(
        'verb="ListRecords"',
        errorXml('noRecordsMatch', 'No records match the request'),
      );
    }

    const records = objects.map((object) => this.recordXml(object)).join('');
    return this.wrapResponse(
      requestAttribute('ListRecords', request),
      `<ListRecords>${records}</ListRecords>`,
    );
  }

  private async getRecord(request: OaiRequest) {
    const error = validateMetadataPrefix(request.metadataPrefix);
    if (error) return this.wrapResponse('verb="GetRecord"', error);

    if (!request.identifier) {
      return this.wrapResponse(
        'verb="GetRecord"',
        errorXml('badArgument', 'Missing identifier'),
      );
    }

    const id = parseOaiIdentifier(request.identifier);
    const object = await this.learningObjectRepository.findOne({
      where: { id, status: ObjectStatus.PUBLISHED },
      relations: ['collection'],
    });

    if (!object) {
      return this.wrapResponse(
        requestAttribute('GetRecord', request),
        errorXml('idDoesNotExist', 'Record does not exist'),
      );
    }

    return this.wrapResponse(
      requestAttribute('GetRecord', request),
      `<GetRecord>${this.recordXml(object)}</GetRecord>`,
    );
  }

  private async findPublishedObjects(set?: string) {
    const where = set
      ? { status: ObjectStatus.PUBLISHED, collectionId: set }
      : { status: ObjectStatus.PUBLISHED };

    return this.learningObjectRepository.find({
      where,
      relations: ['collection'],
      order: { updatedAt: 'DESC' },
    });
  }

  private headerXml(object: LearningObject) {
    const setSpec = object.collectionId
      ? `<setSpec>${xmlEscape(object.collectionId)}</setSpec>`
      : '';
    return `
      <header>
        <identifier>${xmlEscape(toOaiIdentifier(object.id))}</identifier>
        <datestamp>${xmlEscape(formatOaiDate(object.updatedAt))}</datestamp>
        ${setSpec}
      </header>
    `;
  }

  private recordXml(object: LearningObject) {
    return `
      <record>
        ${this.headerXml(object)}
        <metadata>
          ${this.oaiDcXml(object)}
        </metadata>
      </record>
    `;
  }

  private oaiDcXml(object: LearningObject) {
    const metadata = (object.lomMetadata ?? {}) as LomMetadata;
    const keywords = metadata.general?.keyword ?? [];
    const subjects = keywords
      .map((keyword) => `<dc:subject>${xmlEscape(keyword)}</dc:subject>`)
      .join('');

    return `
      <oai_dc:dc
        xmlns:oai_dc="http://www.openarchives.org/OAI/2.0/oai_dc/"
        xmlns:dc="http://purl.org/dc/elements/1.1/"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:schemaLocation="http://www.openarchives.org/OAI/2.0/oai_dc/ http://www.openarchives.org/OAI/2.0/oai_dc.xsd">
        <dc:title>${xmlEscape(object.title)}</dc:title>
        <dc:creator>${xmlEscape(object.author)}</dc:creator>
        <dc:description>${xmlEscape(object.description ?? '')}</dc:description>
        ${subjects}
        ${dcField('language', metadata.general?.language)}
        ${dcField('type', metadata.educational?.learningResourceType)}
        ${dcField('format', object.fileMimeType)}
        ${dcField('rights', metadata.rights?.license)}
        ${dcField('relation', object.collection?.name)}
        <dc:identifier>${xmlEscape(buildCanonicalUrl(object.id))}</dc:identifier>
        ${object.fileUrl ? `<dc:source>${xmlEscape(buildApiFileUrl(object.fileUrl))}</dc:source>` : ''}
        <dc:date>${xmlEscape(formatOaiDate(object.createdAt))}</dc:date>
      </oai_dc:dc>
    `;
  }

  private wrapResponse(requestAttributes: string, body: string) {
    const requestTag = requestAttributes
      ? `<request ${requestAttributes}>${xmlEscape(getOaiBaseUrl())}</request>`
      : `<request>${xmlEscape(getOaiBaseUrl())}</request>`;

    return `<?xml version="1.0" encoding="UTF-8"?>
<OAI-PMH xmlns="http://www.openarchives.org/OAI/2.0/"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.openarchives.org/OAI/2.0/ http://www.openarchives.org/OAI/2.0/OAI-PMH.xsd">
  <responseDate>${formatOaiDate(new Date())}</responseDate>
  ${requestTag}
  ${body}
</OAI-PMH>`;
  }
}

function validateMetadataPrefix(metadataPrefix?: string) {
  if (!metadataPrefix) {
    return errorXml('badArgument', 'Missing metadataPrefix');
  }

  if (metadataPrefix !== 'oai_dc') {
    return errorXml('cannotDisseminateFormat', 'Only oai_dc is supported');
  }

  return null;
}

function requestAttribute(verb: string, request: OaiRequest) {
  const attributes = [`verb="${xmlEscape(verb)}"`];
  if (request.metadataPrefix) {
    attributes.push(`metadataPrefix="${xmlEscape(request.metadataPrefix)}"`);
  }
  if (request.identifier) {
    attributes.push(`identifier="${xmlEscape(request.identifier)}"`);
  }
  if (request.set) {
    attributes.push(`set="${xmlEscape(request.set)}"`);
  }
  return attributes.join(' ');
}

function dcField(name: string, value?: string | null) {
  return value ? `<dc:${name}>${xmlEscape(value)}</dc:${name}>` : '';
}

function errorXml(code: string, message: string) {
  return `<error code="${xmlEscape(code)}">${xmlEscape(message)}</error>`;
}

function toOaiIdentifier(id: string) {
  return `oai:${getRepositoryIdentifier()}:${id}`;
}

function parseOaiIdentifier(identifier: string) {
  const prefix = `oai:${getRepositoryIdentifier()}:`;
  return identifier.startsWith(prefix)
    ? identifier.slice(prefix.length)
    : identifier;
}

function formatOaiDate(date: Date) {
  const value = date.toISOString().replace(/\.\d{3}Z$/, 'Z');
  return OAI_DATE_FORMAT.test(value) ? value : new Date(value).toISOString();
}

function buildCanonicalUrl(id: string) {
  const baseUrl =
    process.env.FRONTEND_PUBLIC_URL ??
    process.env.NEXT_PUBLIC_FRONTEND_URL ??
    'http://localhost:3000';
  return `${baseUrl.replace(/\/$/, '')}/objects/${id}`;
}

function buildApiFileUrl(filePath: string) {
  const baseUrl = process.env.API_PUBLIC_URL ?? 'http://localhost:3001';
  return `${baseUrl.replace(/\/$/, '')}/${filePath.replace(/\\/g, '/')}`;
}

function getOaiBaseUrl() {
  const baseUrl = process.env.API_PUBLIC_URL ?? 'http://localhost:3001';
  return `${baseUrl.replace(/\/$/, '')}/oai`;
}

function getRepositoryName() {
  return (
    process.env.OAI_REPOSITORY_NAME ?? 'Repositorio de Objetos de Aprendizaje'
  );
}

function getRepositoryIdentifier() {
  return process.env.OAI_REPOSITORY_IDENTIFIER ?? 'repositorio-oa';
}

function getAdminEmail() {
  return process.env.OAI_ADMIN_EMAIL ?? 'admin@example.org';
}

function xmlEscape(value: string | number | Date) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
