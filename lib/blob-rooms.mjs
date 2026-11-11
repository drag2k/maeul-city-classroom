import { get, put, BlobPreconditionFailedError } from '@vercel/blob';

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
        if (err instanceof BlobPreconditionFailedError) return false;
        throw err;
      }
    }
  };
}

