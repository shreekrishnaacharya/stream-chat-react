import type { UserResponse } from 'stream-chat';
// import transliterate from '@sindresorhus/transliterate';

import type { DefaultUserType } from '../../../types/types';

export const accentsMap: { [key: string]: string } = {
  a: 'á|à|ã|â|À|Á|Ã|Â',
  c: 'ç|Ç',
  e: 'é|è|ê|É|È|Ê',
  i: 'í|ì|î|Í|Ì|Î',
  n: 'ñ|Ñ',
  o: 'ó|ò|ô|õ|Ó|Ò|Ô|Õ',
  u: 'ú|ù|û|ü|Ú|Ù|Û|Ü',
};

export const removeDiacritics = (text?: string) => {
  if (!text) return '';
  return Object.keys(accentsMap).reduce(
    (acc, current) => acc.replace(new RegExp(accentsMap[current], 'g'), current),
    text,
  );
};

export const calculateLevenshtein = (query: string, name: string) => {
  if (query.length === 0) return name.length;

  const matrix = [];

  let i;
  for (i = 0; i <= name.length; i++) {
    matrix[i] = [i];
  }

  let j;
  for (j = 0; j <= query.length; j++) {
    matrix[0][j] = j;
  }

  for (i = 1; i <= name.length; i++) {
    for (j = 1; j <= query.length; j++) {
      if (name.charAt(i - 1) === query.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          Math.min(
            matrix[i][j - 1] + 1, // insertion
            matrix[i - 1][j] + 1,
          ),
        ); // deletion
      }
    }
  }

  return matrix[name.length][query.length];
};

export const searchLocalUsers = <Us extends DefaultUserType<Us> = DefaultUserType>(
  ownUserId: string | undefined,
  users: UserResponse<Us>[],
  query: string,
  useMentionsTransliteration?: boolean,
): UserResponse<Us>[] => {
  const matchingUsers = users.filter((user) => {
    if (user.id === ownUserId) return false;
    if (!query) return true;

    let updatedId = removeDiacritics(user.id).toLowerCase();
    let updatedName = removeDiacritics(user.name).toLowerCase();
    let updatedQuery = removeDiacritics(query).toLowerCase();

    if (useMentionsTransliteration) {
      (async () => {
        const { default: theDefault } = await import('@sindresorhus/transliterate');
        updatedName = theDefault(user.name || '').toLowerCase();
        updatedQuery = theDefault(query).toLowerCase();
        updatedId = theDefault(user.id).toLowerCase();
        console.log('in the transliteration');
      })();
    }

    if (updatedName !== undefined && updatedName.length) {
      const levenshtein = calculateLevenshtein(updatedQuery, updatedName);

      if (updatedName.includes(updatedQuery) || levenshtein <= 3) return true;
    }

    const levenshtein = calculateLevenshtein(updatedQuery, updatedId);

    return updatedId?.includes(updatedQuery) || levenshtein <= 3;
  });

  return matchingUsers;
};
