import type {
  CreateRequestInput,
  DiscRequest,
  RejectRequestInput,
  UpdateRequestInput,
} from '../domain/request';

/** Releases-owned persistence boundary for requester and moderation workflows. */
export interface RequestsPort {
  create(input: CreateRequestInput): Promise<DiscRequest>;
  listMine(): Promise<DiscRequest[]>;
  list(): Promise<DiscRequest[]>;
  update(id: string, input: UpdateRequestInput): Promise<DiscRequest>;
  approve(id: string): Promise<void>;
  reject(id: string, input: RejectRequestInput): Promise<DiscRequest>;
  reopen(id: string): Promise<DiscRequest>;
}
