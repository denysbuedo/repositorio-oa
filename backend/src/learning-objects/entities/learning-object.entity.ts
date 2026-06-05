import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum ObjectStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  ARCHIVED = 'archived',
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

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
