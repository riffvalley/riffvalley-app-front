import api from '@/shared/infrastructure/http/client';
import type {
  CompleteSuggestionInput,
  CreateSuggestionInput,
  RejectSuggestionInput,
  Suggestion,
  SuggestionFilters,
  SuggestionPriority,
} from '../domain/suggestion';
import type { MySuggestionsResult, SuggestionsPort } from '../application/suggestionsPort';

/** Wire DTO for suggestions; the linked Product Ops object stays opaque here. */
interface SuggestionDto extends Suggestion {
  versionItem: unknown;
}

interface CreateSuggestionDto {
  title: string;
  description: string;
  type?: CreateSuggestionInput['type'];
  priority?: CreateSuggestionInput['priority'];
}

interface UpdateSuggestionPriorityDto {
  priority: SuggestionPriority;
}

interface RejectSuggestionDto {
  rejectionReason: RejectSuggestionInput['rejectionReason'];
}

interface CompleteSuggestionDto {
  versionItemId?: CompleteSuggestionInput['versionItemId'];
}

interface MySuggestionsResponseDto {
  data: SuggestionDto[];
  counts: MySuggestionsResult['counts'];
}

type SuggestionsListResponseDto = SuggestionDto[] | { data: SuggestionDto[] };

function toSuggestionList(response: SuggestionsListResponseDto): Suggestion[] {
  return Array.isArray(response) ? response : response.data;
}

export const suggestionsApi: SuggestionsPort = {
  async create(input) {
    const dto: CreateSuggestionDto = input;
    const response = await api.post<SuggestionDto>('/suggestions', dto);
    return response.data;
  },

  async listMine(filters?: SuggestionFilters) {
    const response = await api.get<MySuggestionsResponseDto>('/suggestions/my', { params: filters });
    return {
      suggestions: response.data.data,
      counts: response.data.counts,
    };
  },

  async list(filters: SuggestionFilters) {
    const response = await api.get<SuggestionsListResponseDto>('/suggestions', { params: filters });
    return toSuggestionList(response.data);
  },

  async updatePriority(id, priority) {
    const dto: UpdateSuggestionPriorityDto = { priority };
    const response = await api.patch<SuggestionDto>(`/suggestions/${id}`, dto);
    return response.data;
  },

  async progress(id) {
    const response = await api.patch<SuggestionDto>(`/suggestions/${id}/progress`);
    return response.data;
  },

  async reject(id, input) {
    const dto: RejectSuggestionDto = input;
    const response = await api.patch<SuggestionDto>(`/suggestions/${id}/reject`, dto);
    return response.data;
  },

  async complete(id, input) {
    const dto: CompleteSuggestionDto = { versionItemId: input.versionItemId };
    const response = await api.patch<SuggestionDto>(`/suggestions/${id}/done`, dto);
    return response.data;
  },

  async delete(id) {
    await api.delete(`/suggestions/${id}`);
  },
};
