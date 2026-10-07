const supabaseStorage =
  /^https:\/\/[^/]+\.supabase\.co\/storage\/v1\/object\/public\/\S+$/;
const imageKit = /^https:\/\/ik\.imagekit\.io\/[A-Za-z0-9_-]+\/\S+$/;

/** Optional custom ImageKit domain, e.g. https://images.example.com */
export const imageKitEndpoint = (
  process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT || ""
).replace(/\/+$/, "");

export function isRemoteImage(value: string) {
  return (
    supabaseStorage.test(value) ||
    imageKit.test(value) ||
    (!!imageKitEndpoint &&
      /^https:\/\//.test(imageKitEndpoint) &&
      value.startsWith(imageKitEndpoint + "/") &&
      !/\s/.test(value))
  );
}

/** Site images, uploaded images, or ImageKit links. */
export function isHostedImage(value: string) {
  return value.startsWith("/images/") || isRemoteImage(value);
}
