import test from 'node:test';
import assert from 'node:assert/strict';

function validateEditMessage({ userId, msgSenderId, isDeletedForAll, newText, createdAt }) {
  if (userId !== msgSenderId) {
    return { ok: false, reason: 'Вы можете редактировать только свои сообщения' };
  }
  if (isDeletedForAll) {
    return { ok: false, reason: 'Нельзя редактировать удалённое сообщение' };
  }
  const trimmed = typeof newText === 'string' ? newText.trim() : '';
  if (!trimmed) {
    return { ok: false, reason: 'Сообщение не может быть пустым' };
  }
  if (trimmed.length > 4000) {
    return { ok: false, reason: 'Сообщение слишком длинное' };
  }
  if (createdAt) {
    const createdDate = new Date(createdAt);
    const timeDiff = Date.now() - createdDate.getTime();
    if (timeDiff > 24 * 60 * 60 * 1000) {
      return { ok: false, reason: 'Сообщение создано более 24 часов назад' };
    }
  }
  return { ok: true, text: trimmed };
}

function validateDeleteMessageAll({ userId, msgSenderId, isDeletedForAll }) {
  if (userId !== msgSenderId) {
    return { ok: false, reason: 'Permission denied' };
  }
  if (isDeletedForAll) {
    return { ok: false, reason: 'Already deleted' };
  }
  return { ok: true };
}

test('editMessage validation: owner can edit valid text', () => {
  const result = validateEditMessage({
    userId: 10,
    msgSenderId: 10,
    isDeletedForAll: 0,
    newText: 'Updated message text',
    createdAt: new Date().toISOString()
  });
  assert.equal(result.ok, true);
  assert.equal(result.text, 'Updated message text');
});

test('editMessage validation: non-owner edit is rejected', () => {
  const result = validateEditMessage({
    userId: 20,
    msgSenderId: 10,
    isDeletedForAll: 0,
    newText: 'Hacked text',
    createdAt: new Date().toISOString()
  });
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'Вы можете редактировать только свои сообщения');
});

test('editMessage validation: empty text edit is rejected', () => {
  const result = validateEditMessage({
    userId: 10,
    msgSenderId: 10,
    isDeletedForAll: 0,
    newText: '   ',
    createdAt: new Date().toISOString()
  });
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'Сообщение не может быть пустым');
});

test('editMessage validation: editing deleted message is rejected', () => {
  const result = validateEditMessage({
    userId: 10,
    msgSenderId: 10,
    isDeletedForAll: 1,
    newText: 'Try revive',
    createdAt: new Date().toISOString()
  });
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'Нельзя редактировать удалённое сообщение');
});

test('deleteMessageAll validation: owner can delete for all', () => {
  const result = validateDeleteMessageAll({
    userId: 10,
    msgSenderId: 10,
    isDeletedForAll: 0
  });
  assert.equal(result.ok, true);
});

test('deleteMessageAll validation: non-owner delete for all is rejected', () => {
  const result = validateDeleteMessageAll({
    userId: 20,
    msgSenderId: 10,
    isDeletedForAll: 0
  });
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'Permission denied');
});
