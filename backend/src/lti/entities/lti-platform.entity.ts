import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('lti_platforms')
export class LtiPlatform {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  name: string;

  @Column({ type: 'varchar', unique: true })
  issuer: string;

  @Column({ type: 'varchar' })
  clientId: string;

  @Column({ type: 'varchar', nullable: true })
  deploymentId: string | null;

  @Column({ type: 'varchar', nullable: true })
  authLoginUrl: string | null;

  @Column({ type: 'varchar', nullable: true })
  authTokenUrl: string | null;

  @Column({ type: 'varchar', nullable: true })
  jwksUrl: string | null;

  @Column({ type: 'boolean', default: true })
  enabled: boolean;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
