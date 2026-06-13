import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Collection } from '../../collections/entities/collection.entity';

export enum ObjectStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  ARCHIVED = 'archived',
}

export enum ProcessingStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  READY = 'ready',
  FAILED = 'failed',
}

@Entity('learning_objects')
export class LearningObject {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column()
  author: string;

  @Column({
    type: 'enum',
    enum: ObjectStatus,
    default: ObjectStatus.DRAFT,
  })
  status: ObjectStatus;

  /**
   * Metadatos IEEE LOM almacenados como JSONB para flexibilidad total.
   * Esto permite almacenar la jerarquía completa del estándar sin
   * complicaciones de esquemas rígidos.
   */
  @Column({ type: 'jsonb', nullable: true })
  lomMetadata: any;

  @Column({ nullable: true })
  fileUrl: string;

  @Column({ nullable: true })
  fileMimeType: string;

  @Column({ type: 'varchar', nullable: true })
  originalFilename: string | null;

  @Column({ type: 'integer', nullable: true })
  fileSize: number | null;

  @Column({ type: 'timestamptz', nullable: true })
  uploadedAt: Date | null;

  @Column({
    type: 'enum',
    enum: ProcessingStatus,
    default: ProcessingStatus.PENDING,
  })
  processingStatus: ProcessingStatus;

  @Column({ type: 'text', nullable: true })
  processingError: string | null;

  @Column({ type: 'uuid', nullable: true })
  collectionId: string | null;

  @ManyToOne(() => Collection, (collection) => collection.learningObjects, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'collectionId' })
  collection: Collection | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
