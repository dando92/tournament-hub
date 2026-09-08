import { DataSource } from 'typeorm';
import { genSalt, hash } from 'bcrypt';

import { Account } from '@tournament-hub/persistence';

export async function seedInitialAdmin(dataSource: DataSource): Promise<void> {
  const username = process.env.INITIAL_ADMIN_USERNAME?.trim().toLowerCase();
  const password = process.env.INITIAL_ADMIN_PASSWORD;

  if (!username || !password) {
    console.log(
      'Initial administrator seed skipped; INITIAL_ADMIN_USERNAME and INITIAL_ADMIN_PASSWORD are not both set.',
    );
    return;
  }

  const accounts = dataSource.getRepository(Account);
  const existing = await accounts.findOneBy({ username });
  if (existing) {
    console.log(`Initial administrator account "${username}" already exists.`);
    return;
  }

  const account = new Account();
  account.username = username;
  account.email = `${username}@tournament-hub.local`;
  account.password = await hash(password, await genSalt(10));
  account.isAdmin = true;
  account.isTournamentCreator = true;

  await accounts.save(account);
  console.log(`Created initial administrator account "${username}".`);
}
