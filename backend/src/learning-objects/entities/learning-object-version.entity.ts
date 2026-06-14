import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { LearningObject } from './learning-object.entity';

export enum VersionChangeType {
  INITIAL_PUBLICATION = 'initial_publication',
  METADATA_UPDATE = 'metadata_update',
  FILE_UPDATE = 'file_update',
}

@Index(['learningObjectId', 'versionLabel'], { unique: true })
@Entity('learning_object_versions')
export class LearningObjectVersion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  learningObjectId: string;

  @ManyToOne(() => LearningObject, (object) => object.versions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'learningObjectId' })
  learningObject: LearningObject;

  @Column({ type: 'varchar' })
  versionLabel: string;

  @Column({
    type: 'enum',
    enum: VersionChangeType,
  })
  changeType: VersionChangeType;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column()
  author: string;

  @Column({ type: 'jsonb', nullable: true })
  lomMetadata: unknown;

  @Column({ type: 'varchar', nullable: true })
  fileUrl: string | null;

  @Column({ type: 'varchar', nullable: true })
  fileMimeType: string | null;

  @Column({ type: 'varchar', nullable: true })
  originalFilename: string | null;

  @Column({ type: 'integer', nullable: true })
  fileSize: number | null;

  @Column({ type: 'varchar', nullable: true })
  fileChecksumSha256: string | null;

  @Column({ type: 'text', nullable: true })
  changeNote: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
