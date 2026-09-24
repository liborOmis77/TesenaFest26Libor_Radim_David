import { uniqueName } from '../../src/data';
import { expect, test } from '../../src/fixtures';

test.describe('Projects', () => {
  test(
    'TC-001 [Projects] A new project is created and comes back under the name that was entered',
    { tag: ['@smoke', '@TC-001'] },
    async ({ testData }) => {
      const name = uniqueName('project');

      const project = await testData.createProject({ name });

      expect(project.name).toBe(name);
    },
  );
});
