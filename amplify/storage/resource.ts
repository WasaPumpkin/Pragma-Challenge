// amplify/storage/resource.ts

import { defineStorage } from '@aws-amplify/backend-storage';

export const storage = defineStorage({
  name: 'pragmachallengestorage',
  access: (allow) => ({
    'public/*': [allow.guest.to(['read']), allow.authenticated.to(['read'])],
    'protected/{entity_id}/*': [
      allow.authenticated.to(['read', 'write', 'delete']),
    ],
  }),
});
