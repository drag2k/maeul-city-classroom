import { get, head, put, BlobPreconditionFailedError } from '@vercel/blob';

const isWriteConflict = err => err instanceof BlobPreconditionFailedError || /conditional request cannot succeed due to a conflicting operation/i.test(err.message);

const pathFor = (prefix, code) => {
  if (!/^[0-9a-f]{14}$/.test(code)) return null;
  return prefix + '/' + code + '.json';
};
export function roomStore(prefix = process.env.VERCEL_ENV === 'preview' ? 'preview-rooms' : 'rooms') {
  return {
    async read(code) {
      const path = pathFor(prefix,code);
      if (!path) return null;
      const result = await get(path,{access:'private',useCache:false});
      if (!result) return null;
      const row = JSON.parse(await new Response(result.stream).text());
      return {...row,etag:result.blob.etag};
    },
    async insert(code,body,version=0) {
      const path = pathFor(prefix,code);
      if (!path) throw Error('Invalid classroom identifier');
      await put(path,JSON.stringify({version,body}),{access:'private',addRandomSuffix:false,allowOverwrite:false,contentType:'application/json'});
    },
    async update(code,old,body) {
      if (!old.etag) throw Error('Missing classroom ETag');
      try {
        await put(pathFor(prefix,code),JSON.stringify({version:old.version+1,body}),{access:'private',addRandomSuffix:false,allowOverwrite:true,ifMatch:old.etag,contentType:'application/json'});
        return true;
      } catch (err) {
        if (!isWriteConflict(err)) throw err;
        const path = pathFor(prefix,code);
        const metadata = await head(path);
        if (!metadata.etag || metadata.etag === old.etag) return false;
        // Recheck the data after acquiring the storage ETag. A later write
        // will still fail the conditional put instead of overwriting it.
        const latest = await this.read(code);
        if (!latest || latest.version !== old.version || latest.body !== old.body) return false;
        try {
          await put(path,JSON.stringify({version:old.version+1,body}),{access:'private',addRandomSuffix:false,allowOverwrite:true,ifMatch:metadata.etag,contentType:'application/json'});
          return true;
        } catch (retryError) {
          if (isWriteConflict(retryError)) return false;
          throw retryError;
        }
      }
    }
  };
}
