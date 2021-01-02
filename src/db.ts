import Datastore, { DataStoreOptions } from 'nedb';
import { lp } from 'logscribe';

export const getDataStore = (filename: string): Datastore | undefined => {
  try {
    const dbTemplate: DataStoreOptions = {
      filename,
      autoload: true,
      inMemoryOnly: false,
    };
    return new Datastore(dbTemplate);
  } catch (err) {
    lp(err);
    return undefined;
  }
};
