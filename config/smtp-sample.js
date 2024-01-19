const smtp = {
    host: "smtp.xyz.com",
    port: 587,
    secure: false,
    auth: {
        user: "sample@user.com",
        pass: "password-or-app-password"
    },
    tls: {
        ciphers: "SSLv3",
        rejectUnauthorized: false
    }
}

module.exports = smtp