// @vitest-environment happy-dom
import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import VideosKanban from './VideosKanban.vue';
import { createVideo, getVideos, updateVideo } from '@services/videos/videos';
import { getRvUsers } from '@/modules/identity/users';
import SwalService from '@services/swal/SwalService';

const { push } = vi.hoisted(() => ({ push: vi.fn() }));
const userId = '96066b47-c254-4592-a526-8954c8601496';
const editorId = 'd2342314-9a14-40c9-bcf2-006c6b927b4c';
let apiVideo: any;

vi.mock('vue-router', () => ({ useRouter: () => ({ push }) }));
vi.mock('@/modules/identity/auth', () => ({
    useAuthStore: () => ({ userId, username: 'Usuario', image: undefined })
}));
vi.mock('@/modules/identity/users', () => ({ getRvUsers: vi.fn() }));
vi.mock('@services/videos/videos', () => ({
    getVideos: vi.fn(),
    createVideo: vi.fn(),
    updateVideo: vi.fn(),
    deleteVideo: vi.fn(),
    createVideoList: vi.fn(),
    createVideoContent: vi.fn(),
    VIDEO_TYPES: ['best', 'custom'],
    toISO: (date: Date) => date.toISOString()
}));
vi.mock('@services/swal/SwalService', () => ({
    default: { error: vi.fn(), success: vi.fn(), confirm: vi.fn() }
}));

function savedVideo() {
    return {
        ...apiVideo,
        user: apiVideo.user ? { ...apiVideo.user } : undefined,
        editor: apiVideo.editor ? { ...apiVideo.editor } : undefined
    };
}

function mountBoard() {
    return mount(VideosKanban, {
        global: { stubs: { RouterLink: true } }
    });
}

describe('VideosKanban assignments', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        apiVideo = {
            id: 'video-1',
            name: 'Video de prueba',
            status: 'not_started',
            type: 'best',
            updateDate: null,
            createdAt: '',
            updatedAt: '',
            user: { id: userId, username: 'Usuario' },
            editor: { id: editorId, username: 'Editora' },
            content: null
        };
        vi.mocked(getRvUsers).mockResolvedValue([
            { id: userId, username: 'Usuario' } as any,
            { id: editorId, username: 'Editora' } as any
        ]);
        vi.mocked(getVideos).mockImplementation(async () => [savedVideo()] as any);
        vi.mocked(updateVideo).mockImplementation(async (_id, payload) => {
            if (Object.prototype.hasOwnProperty.call(payload, 'userId')) {
                apiVideo.user = payload.userId ? { id: payload.userId, username: 'Usuario' } : undefined;
            }
            if (Object.prototype.hasOwnProperty.call(payload, 'editorId')) {
                apiVideo.editor = payload.editorId ? { id: payload.editorId, username: 'Editora' } : undefined;
            }
            return savedVideo() as any;
        });
    });

    it('creates a Video without a link and keeps the supported form fields', async () => {
        const createdVideo = {
            id: 'video-new',
            name: 'Nuevo vídeo',
            status: 'not_started',
            type: 'custom',
            updateDate: null,
            createdAt: '',
            updatedAt: '',
            content: null
        };
        vi.mocked(createVideo).mockResolvedValue(createdVideo as any);
        const wrapper = mountBoard();
        await flushPromises();

        expect(wrapper.find('input[type="url"]').exists()).toBe(false);
        await wrapper.findAll('button').find(button => button.text().includes('Vídeo'))!.trigger('click');
        const modal = wrapper.find('.fixed.inset-0');
        await modal.find('input[type="text"]').setValue('Nuevo vídeo');
        await modal.find('select').setValue('custom');
        await modal.find('input[type="date"]').setValue('2026-10-15');
        await modal.findAll('button').find(button => button.text().trim() === 'Guardar')!.trigger('click');
        await flushPromises();

        const payload = vi.mocked(createVideo).mock.calls[0][0] as Record<string, unknown>;
        expect(payload).toMatchObject({
            name: 'Nuevo vídeo',
            type: 'custom',
            status: 'not_started',
            userId
        });
        expect(payload.updateDate).toBe('2026-10-15T00:00:00.000Z');
        expect(payload).not.toHaveProperty('link');
        expect(wrapper.text()).toContain('Nuevo vídeo');
        wrapper.unmount();
    });

    it('updates a Video without a link and preserves the other editable fields', async () => {
        vi.mocked(updateVideo).mockResolvedValueOnce({ ...apiVideo, name: 'Título editado' } as any);
        const wrapper = mountBoard();
        await flushPromises();
        await wrapper.find('button[title="Editar"]').trigger('click');
        const modal = wrapper.find('.fixed.inset-0');
        await modal.find('input[type="text"]').setValue('Título editado');
        await modal.find('input[type="date"]').setValue('2026-10-14');
        await modal.findAll('button').find(button => button.text().trim() === 'Guardar')!.trigger('click');
        await flushPromises();

        const payload = vi.mocked(updateVideo).mock.calls[0][1] as Record<string, unknown>;
        expect(payload).toMatchObject({ name: 'Título editado', type: 'best' });
        expect(payload.updateDate).toBe('2026-10-14T00:00:00.000Z');
        expect(payload).not.toHaveProperty('link');
        expect(wrapper.text()).toContain('Título editado');
        wrapper.unmount();
    });

    it('selects, explicitly clears and reloads User/Editor assignments', async () => {
        const wrapper = mountBoard();
        await flushPromises();

        expect(wrapper.text()).toContain('Usuario');
        expect(wrapper.text()).toContain('Editora');

        const userLabel = wrapper.findAll('span').find(span => span.text() === 'Usuario')!;
        await userLabel.trigger('click');
        const userSelect = wrapper.findAll('select').find(select => select.find('option[value=""]').exists())!;
        await userSelect.setValue('');
        await flushPromises();

        expect(updateVideo).toHaveBeenCalledWith('video-1', { userId: null });
        expect(wrapper.text()).toContain('Sin asignar');
        expect(wrapper.text()).toContain('Editora');

        const editorLabel = wrapper.findAll('div').find(div =>
            div.attributes('class')?.includes('bg-purple-50/50') && div.text().includes('Editora')
        )!;
        await editorLabel.trigger('click');
        const editorSelect = wrapper.findAll('select').find(select => select.find('option[value=""]').exists())!;
        await editorSelect.setValue('');
        await flushPromises();

        expect(updateVideo).toHaveBeenCalledWith('video-1', { editorId: null });
        expect(wrapper.text()).toContain('Sin editor');

        wrapper.unmount();
        const reloaded = mountBoard();
        await flushPromises();
        expect(reloaded.text()).toContain('Sin asignar');
        expect(reloaded.text()).toContain('Sin editor');
        reloaded.unmount();
    });

    it('restores the visible assignment and shows the backend error after HTTP 400', async () => {
        vi.mocked(updateVideo).mockRejectedValueOnce({
            response: { data: { message: 'El video debe tener un usuario asignado.' } }
        });
        const wrapper = mountBoard();
        await flushPromises();

        const userLabel = wrapper.findAll('span').find(span => span.text() === 'Usuario')!;
        await userLabel.trigger('click');
        const userSelect = wrapper.findAll('select').find(select => select.find('option[value=""]').exists())!;
        await userSelect.setValue('');
        await flushPromises();

        expect(wrapper.text()).toContain('Usuario');
        expect(wrapper.text()).not.toContain('Sin asignar');
        expect(SwalService.error).toHaveBeenCalledWith('El video debe tener un usuario asignado.');
        wrapper.unmount();
    });
});
