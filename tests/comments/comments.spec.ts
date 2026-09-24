import { uniqueName } from '../../src/data';
import { expect, Schema, test } from '../../src/fixtures';

test(
  'TC-005 [Comments] A comment is added to a task with the text that was entered',
  { tag: ['@TC-005', '@smoke'] },
  async ({ api, testData }) => {
    const task = await test.step('Create a task to comment on', () => testData.createTask());

    const content = uniqueName('comment');

    const created = await test.step('Add a comment with the entered text to the task', () =>
      testData.createComment({ task_id: task.id }, { content }));

    await test.step('Check the created comment schema and text', () => {
      expect(created).toMatchSchema(Schema.comment);
      expect(created.content).toBe(content);
    });

    await test.step('Load the task comments and check the persisted comment', async () => {
      const comments = await api.comments.list({ task_id: task.id });
      expect(comments).toHaveLength(1);
      expect(comments[0]).toMatchObject({ id: created.id, content });
    });
  },
);
