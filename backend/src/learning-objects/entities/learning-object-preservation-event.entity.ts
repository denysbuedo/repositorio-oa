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
import { LearningObjectVersion } from './learning-object-version.entity';

export enum PreservationEventType {
  CHECKSUM_CALCULATED = 'checksum_calculated',
  VERSION_SNAPSHOT_CREATED = 'version_snapshot_created',
  FILE_REPLACED = 'file_replaced',
}

@Index(['learningObjectId', 'createdAt'])
@Entity('learning_object_preservation_events')
export class LearningObjectPreservationEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  learningObjectId: string;

  @ManyToOne(() => LearningObject, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'learningObjectId' })
  learningObject: LearningObject;

  @Column({ type: 'uuid', nullable: true })
  versionId: string | null;

  @ManyToOne(() => LearningObjectVersion, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'versionId' })
  version: LearningObjectVersion | null;

  @Column({
    type: 'enum',
    enum: PreservationEventType,
  })
  eventType: PreservationEventType;

  @Column({ type: 'varchar', nullable: true })
  versionLabel: string | null;

  @Column({ type: 'text' })
  message: string;

  @Column({ type: 'jsonb', nullable: true })
  details: Record<string, unknown> | null;

  @Column({ type: 'varchar', nullable: true })
  actor: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
