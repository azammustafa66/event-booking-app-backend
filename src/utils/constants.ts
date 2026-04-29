export const CookieOptions = {
    httpOnly: true,
    // secure: false in development so cookies work over plain http (localhost)
    secure: process.env.NODE_ENV === 'production'
}