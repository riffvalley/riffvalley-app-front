// @vitest-environment happy-dom
import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import VideoActionsModal from './VideoActionsModal.vue';

const userId = '96066b47-c254-4592-a526-8954c8601496';
const editorId = 'd2342314-9a14-40c9-bcf2-006c6b927b4c';

function mountModal(overrides: Record<string, unknown> = {}) {
    return mount(VideoActionsModal, {
        props: {
            show: true,
            rvUsers: [
                { id: userId, username: 'Usuario' },
                { id: editorId, username: 'Editora' }
            ],
            content: {
                id: 'content-1',
                type: 'video',
                name: 'Video de prueba',
                notes: '',
                publicationDate: null,
                video: {
                    id: 'video-1',
                    name: 'Video de prueba',
                    status: 'not_started',
                    type: 'best',
                    updateDate: null,
                    user: { id: userId },
                    editor: { id: editorId }
                }
            } as any,
            ...overrides
        }
    });
}

describe('VideoActionsModal relationship updates', () => {
    it('has no obsolete link control and emits the supported Video fields', async () => {
        const wrapper = mountModal();

        expect(wrapper.find('input[type="url"]').exists()).toBe(false);
        const nameInput = wrapper.find('input[placeholder="Título del video..."]');
        await nameInput.setValue('Título actualizado');
        const saveButton = wrapper.findAll('button').find(button => button.text().includes('Guardar Cambios'))!;
        await saveButton.trigger('click');

        const payload = wrapper.emitted('update-video')?.[0]?.[0] as Record<string, unknown>;
        expect(payload).toMatchObject({
            videoId: 'video-1',
            name: 'Título actualizado',
            type: 'best',
            status: 'not_started'
        });
        expect(payload).not.toHaveProperty('link');
        wrapper.unmount();
    });

});
