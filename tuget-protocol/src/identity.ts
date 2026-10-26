/** Native Messaging Host 的全局登记名称。 */
export const NATIVE_HOST_NAME = 'com.tuget.desktop' as const;

/** 由 desktop 专用公钥派生，不能复用 store/official 身份。 */
export const DESKTOP_EXTENSION_ID = 'dojjjgfogfhepmnoejgaofgooohddlcm' as const;

export const DESKTOP_EXTENSION_ORIGIN = `chrome-extension://${DESKTOP_EXTENSION_ID}/` as const;

/** Chromium Manifest `key` 字段使用的 DER SubjectPublicKeyInfo Base64。 */
export const DESKTOP_EXTENSION_MANIFEST_PUBLIC_KEY = 'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAv9k8MxI+xsE00phX5EGRmjf4Y5wbdn2jvx/IRbf6i/2jvvFLAfLP0p5g/MVzuOg44/UAzaluFJoO1IpJBNIREZkoVLOCenbu/bmdsp5y0fTi4egWtQ3yDOSOjEnQkQik87OWs0Js1pVnzd849bCXOMEABSapc9soIUpm1h6eRAyAwfc7XG4wO/SP28LKMyrwIeN7GTrFtXbS1YgNapb8eBo3IBjvmJHhftJTHx34pIDKsEUxb33KtrQ6iWjmoZRM2yn34sPmEPPB914tMNF+i2o/AVdvdtt6IIJoO3DKr7b+aitqWrfc8Sou+hwiKXLFKdN/kNencU9BL8RLuec8lQIDAQAB' as const;

export const DESKTOP_EXTENSION_PUBLIC_KEY_SHA256 = '3E:99:96:5E:65:74:FC:DE:49:60:E5:6E:EE:73:3B:2C:9C:35:BE:42:7D:C6:0C:09:84:18:65:FD:D8:CB:27:0D' as const;

