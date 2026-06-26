import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { LearningObject } from '../../learning-objects/entities/learning-object.entity';

export enum UsageEventType {
  VIEW = 'view',
  DOWNLOAD = 'download',
  LTI_LAUNCH = 'lti_launch',
}

@Entity('learning_object_usage_events')
export class UsageEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  learningObjectId: string;

  @ManyToOne(() => LearningObject, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'learningObjectId' })
  learningObject: LearningObject;

  @Column({
    type: 'enum',
    enum: UsageEventType,
  })
  eventType: UsageEventType;

  @Column({ type: 'varchar', nullable: true })
  source: string | null;

  @Column({ type: 'jsonb', nullable: true })
  context: Record<string, unknown> | null;

  @CreateDateColumn()
  createdAt: Date;
}
