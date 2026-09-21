import test from 'node:test';
import assert from 'node:assert/strict';
import { dispatchConversationScope, requireDispatchAdministrator } from '../src/modules/envio-em-massa/conversation-access.ts';

test('employees have different owner scopes; no access to unassigned conversations', () => {
  const first = dispatchConversationScope({ id: 'employee-a', role: 'EMPLOYEE' });
  const second = dispatchConversationScope({ id: 'employee-b', role: 'EMPLOYEE' });
  assert.equal(first.ownerUserId, 'employee-a');
  assert.equal(second.ownerUserId, 'employee-b');
  assert.notEqual(first.ownerUserId, second.ownerUserId);
  assert.equal(first.deletedAt, null);
  assert.deepEqual(first.memory, { path: ['source'], equals: 'mass-message' });
});
test('admin sees all dispatch owners but cannot include deleted or unrelated conversations', () => {
  const scope = dispatchConversationScope({ id: 'admin', role: 'ADMIN' });
  assert.equal(scope.ownerUserId, undefined);
  assert.equal(scope.deletedAt, null);
  assert.deepEqual(scope.memory, { path: ['source'], equals: 'mass-message' });
});
test('only admin can change assignment; unknown roles fail closed', () => {
  assert.doesNotThrow(() => requireDispatchAdministrator({ role: 'ADMIN' }));
  for (const role of ['EMPLOYEE', 'UNKNOWN']) {
    assert.throws(() => requireDispatchAdministrator({ role }), /FORBIDDEN/);
    assert.equal(dispatchConversationScope({ id: 'restricted', role }).ownerUserId, 'restricted');
  }
});
