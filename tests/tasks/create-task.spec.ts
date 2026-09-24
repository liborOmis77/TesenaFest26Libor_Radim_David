import { expect, Schema, test } from '../../src/fixtures';
import { tomorrowIn } from '../../src/utils/dates';

test(
  'TC-003 A new task is created with the due date that was entered',
  { tag: ['@TC-003', '@smoke'] },
  async ({ api, testData, accountTimezone }) => {
    const dueDate = await test.step('Choose tomorrow in the account timezone', () =>
      tomorrowIn(accountTimezone));

    const created = await test.step('Create a task with the entered due date', () =>
      testData.createTask({ due_date: dueDate }));

    await test.step('Check the created task schema and due date', () => {
      expect(created).toMatchSchema(Schema.task);
      expect(created.due?.date).toBe(dueDate);
    });

    await test.step('Load the task and check the persisted due date', async () => {
      const task = await api.tasks.get(created.id);
      expect(task).toMatchSchema(Schema.task);
      expect(task.id).toBe(created.id);
      expect(task.due?.date).toBe(dueDate);
    });
  },
);
