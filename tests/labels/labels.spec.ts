import { buildLabel } from '../../src/data';
import { expect, Schema, test } from '../../src/fixtures';

test(
  'TC-004 A new label is created under the name that was entered',
  { tag: ['@TC-004', '@smoke'] },
  async ({ api, testData }) => {
    const payload = await test.step('Prepare a unique label name', () => buildLabel());

    const created = await test.step('Create a label with the entered name', () =>
      testData.createLabel(payload));

    await test.step('Check the created label schema and name', () => {
      expect(created).toMatchSchema(Schema.label);
      expect(created.name).toBe(payload.name);
    });

    await test.step('Load the label and check the persisted name', async () => {
      const label = await api.labels.get(created.id);
      expect(label).toMatchSchema(Schema.label);
      expect(label.id).toBe(created.id);
      expect(label.name).toBe(payload.name);
    });
  },
);
