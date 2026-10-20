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

    it('sends explicit null when User and Editor are cleared, preserving UUID selections', async () => {
        const wrapper = mountModal();
        const selects = wrapper.findAll('select');
        const assignmentSelects = selects.slice(-2);

        await assignmentSelects[0].setValue('');
        await assignmentSelects[1].setValue(userId);
        const saveButton = wrapper.findAll('button').find(button => button.text().includes('Guardar Cambios'))!;
        await saveButton.trigger('click');

        expect(wrapper.emitted('update-video')?.[0]?.[0]).toMatchObject({
            videoId: 'video-1',
            userId: null,
            editorId: userId
        });

        wrapper.unmount();
    });

    it('omits User and Editor when the form values have not changed', async () => {
        const wrapper = mountModal();

        const saveButton = wrapper.findAll('button').find(button => button.text().includes('Guardar Cambios'))!;
        await saveButton.trigger('click');

        const payload = wrapper.emitted('update-video')?.[0]?.[0] as Record<string, unknown>;
        expect(payload).not.toHaveProperty('userId');
        expect(payload).not.toHaveProperty('editorId');

        wrapper.unmount();
    });

    it('restores saved User and Editor values when the API update is rejected', async () => {
        const wrapper = mountModal();
        const assignmentSelects = wrapper.findAll('select').slice(-2);
        await assignmentSelects[0].setValue('');
        await assignmentSelects[1].setValue('');

        await wrapper.setProps({ videoUpdateError: 1 });

        expect((assignmentSelects[0].element as HTMLSelectElement).value).toBe(userId);
        expect((assignmentSelects[1].element as HTMLSelectElement).value).toBe(editorId);
        wrapper.unmount();
    });
});
