import { UnprocessableEntityException } from '@nestjs/common';

import { AccountCommands } from '@account/account.commands';
import { AccountStore } from '@account/account.store';

describe('AccountCommands', () => {
  it('normalizes a username before checking whether it is already registered', async () => {
    const store = {
      byUsername: jest.fn().mockResolvedValue({ id: 'existing' }),
    } as unknown as AccountStore;
    const commands = new AccountCommands(store);

    await expect(
      commands.create({
        username: 'AlreadyHere',
        email: 'existing@example.test',
        password: 'Password!',
      }),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
    expect(store.byUsername).toHaveBeenCalledWith('alreadyhere');
  });
});
