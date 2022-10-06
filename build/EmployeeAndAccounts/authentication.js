"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkCredentials = void 0;
const express_1 = __importDefault(require("express"));
const dotenv_1 = __importDefault(require("dotenv"));
const client_1 = require("@prisma/client");
const passport_1 = __importDefault(require("passport"));
const passport_local_1 = __importDefault(require("passport-local"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const emailConfig_1 = __importDefault(require("../email/emailConfig"));
const PhilLocations_1 = __importDefault(require("../Constants/PhilLocations"));
const express_graphql_1 = require("express-graphql");
const graphql_1 = require("graphql");
const rootQueryMutation_1 = require("./rootQueryMutation");
const path_1 = __importDefault(require("path"));
const cloudinary_1 = __importDefault(require("../cloudinary"));
let authRoute = express_1.default.Router(); //initialized express router
dotenv_1.default.config(); //initialized environment variables
const dataPool = new client_1.PrismaClient(); //database pool
//setup authentication with passport
const LocalStrategy = passport_local_1.default.Strategy;
passport_1.default.use(new LocalStrategy({ usernameField: "email" }, function (email, password, done) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            //get account from database
            const employee = yield dataPool.employee.findUnique({
                where: {
                    email: email
                },
                select: {
                    id: true,
                    first_name: true,
                    last_name: true,
                    email: true,
                    position: true,
                    user_account: {
                        select: {
                            id: true,
                            password: true
                        }
                    }
                }
            });
            //check if account exist
            if (!employee || !(employee === null || employee === void 0 ? void 0 : employee.user_account))
                return done(null, false, { message: 'Employee not found.' });
            //check password
            try {
                if (yield bcryptjs_1.default.compare(password, employee.user_account.password)) {
                    return done(null, { userId: employee.user_account.id, username: `${employee.first_name} ${employee.last_name}`, position: employee.position });
                }
                else
                    return done(null, false, { message: 'Password incorrect' });
            }
            catch (err) {
                return done(null, false, { message: 'Failed to parse password.',
                    details: err.message });
            }
            // catch errors
        }
        catch (err) {
            return done(null, false, { message: 'Connection to database failed.',
                details: err.message });
        }
    });
}));
;
function checkCredentials(req, res, next) {
    const authHeader = req.headers.authorization;
    try {
        const decoded = VerifyToken(authHeader);
        if (!decoded)
            return res.status(401).json({ error: "Invalid Token" });
        req.user = decoded;
        next();
    }
    catch (_a) {
        return res.status(400).json({ error: "Unauthorized" });
    }
}
exports.checkCredentials = checkCredentials;
;
function VerifyToken(authHeader) {
    const token = authHeader && authHeader.split(' ')[1];
    if (!token)
        throw new Error("Log in required");
    try {
        const decoded = jsonwebtoken_1.default.verify(token, process.env.SECRET_KEY);
        if (decoded)
            return decoded;
        else
            return false;
    }
    catch (error) {
        return false;
    }
}
;
//profile image storage
const mediaDIR = path_1.default.join(__dirname, '..', 'media', 'employees');
authRoute.post('/upload/profile/:employeeId', checkCredentials, cloudinary_1.default.single('image'), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    if (!req.file) {
        return res.status(400).json({
            success: false,
            message: "Failed to upload file."
        });
    }
    else {
        try {
            yield dataPool.employee.update({
                where: {
                    id: parseInt(req.params.employeeId),
                },
                data: {
                    profile_image: req.file.path,
                },
            });
            return res.status(201).json({
                success: true,
                fileName: req.file.path
            });
        }
        catch (err) {
            return res.status(400).json({
                success: false,
                message: err.message
            });
        }
    }
}));
authRoute.use('/images', express_1.default.static(mediaDIR));
//--------------------------------------------------------------------------------//
//express auth signup route
authRoute.post('/signup', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const email = req.body.email;
    const password = req.body.password;
    //check sent credentials
    if (!email && !password)
        res.status(400).json({ error: "email and password required" });
    else if (!email || !password)
        res.status(400).json({ error: `${!email ? 'email required' : ''}${!password ? 'password required' : ''}` });
    else if (password.length < 9)
        res.status(400).json({ error: 'Password is too short' });
    else {
        try {
            //check if employee exist
            const employee = yield dataPool.employee.findUnique({
                where: {
                    email: email
                },
                select: {
                    id: true,
                    email: true,
                    user_account: {
                        select: {
                            id: true
                        }
                    }
                }
            });
            if (!employee)
                return res.status(400).json({ error: 'Employee does not exist.' });
            if ((_a = employee.user_account) === null || _a === void 0 ? void 0 : _a.id)
                return res.status(400).json({ error: 'Employee already have an account.' });
            //hash password 
            const hashedPassword = yield bcryptjs_1.default.hash(password, 10);
            //register new account
            const newAccount = yield dataPool.account.create({
                data: {
                    employee_id: employee.id,
                    password: hashedPassword
                },
                include: {
                    employee: {
                        select: {
                            first_name: true,
                            last_name: true
                        }
                    }
                }
            });
            //return username
            return res.status(201).json({ success: `${newAccount.employee.first_name} ${newAccount.employee.last_name}` });
        }
        catch (err) {
            return res.status(400).json({ error: err.message });
        }
    }
}));
//--------------------------------------------------------------------------------//
//express auth login route
authRoute.post('/login', (req, res, next) => {
    passport_1.default.authenticate('local', (err, user, info) => {
        if (err)
            return res.status(401).json({ error: err.message });
        else if (!user)
            return res.status(401).json({ error: info });
        else {
            try {
                const accessToken = jsonwebtoken_1.default.sign(user, process.env.SECRET_KEY, { algorithm: 'HS256', expiresIn: '24h' });
                const refreshToken = jsonwebtoken_1.default.sign(user, process.env.SECRET_KEY, { algorithm: 'HS256', expiresIn: '7d' });
                return res.status(200).json({ token: { access: accessToken, refresh: refreshToken }, auth: user });
            }
            catch (err) {
                return res.status(400).json({ error: err.message });
            }
        }
    })(req, res, next);
});
//--------------------------------------------------------------------------------//
//express auth refresh token route
authRoute.get('/refresh', checkCredentials, (req, res) => {
    const profile = req.user;
    if (!profile)
        return res.status(401).json({ error: "Invalid user" });
    const user = { userId: profile.userId, username: profile.username, position: profile.position };
    //hash new access token
    const accessToken = jsonwebtoken_1.default.sign(user, process.env.SECRET_KEY, { algorithm: 'HS256', expiresIn: '24h' });
    return res.status(201).json({ token: { access: accessToken }, auth: user });
});
//--------------------------------------------------------------------------------//
//express auth user profile route
authRoute.get('/user', checkCredentials, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const profile = req.user;
    if (!profile)
        return res.status(404).json({ error: "Invalid user" });
    try {
        const profileImage = yield dataPool.account.findUnique({
            where: {
                id: profile.userId
            },
            select: {
                employee: {
                    select: {
                        id: true,
                        profile_image: true
                    }
                }
            }
        });
        if (!profileImage)
            return res.status(404).json({ error: "Invalid user" });
        return res.status(200).json({ account: { id: profile.userId, username: profile.username, position: profile.position, image: profileImage.employee.profile_image, employeeId: profileImage.employee.id } });
    }
    catch (err) {
        return res.status(400).json({ error: err.message });
    }
}));
//--------------------------------------------------------------------------------//
//express auth reset password route
authRoute.post('/resetPassword', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _b;
    const email = req.body.email;
    const firstName = req.body.firstName;
    const lastName = req.body.lastName;
    if (!email || !firstName || !lastName)
        return res.status(404).json({ error: "Email and Username is required" });
    try {
        //check user
        const accountVerify = yield dataPool.employee.findFirst({
            where: {
                email: email,
                first_name: firstName,
                last_name: lastName
            },
            select: {
                id: true,
                first_name: true,
                email: true,
                user_account: {
                    select: {
                        id: true
                    }
                }
            }
        });
        if (!accountVerify || !((_b = accountVerify.user_account) === null || _b === void 0 ? void 0 : _b.id))
            return res.status(404).json({ error: "User does not exist" });
        //hash reset code
        try {
            const randomCode = Math.floor(100000 + Math.random() * 900000);
            yield dataPool.account.update({
                where: {
                    id: accountVerify.user_account.id
                },
                data: {
                    reset_code: randomCode.toString()
                }
            });
            //send reset token to email
            const emailRespose = yield (0, emailConfig_1.default)(accountVerify.email, "Reset Password", accountVerify.first_name, randomCode.toString());
            if (!emailRespose)
                return res.status(400).json({ error: "Email send failed" });
        }
        catch (err) {
            return res.status(400).json({ error: err.message });
        }
        //send success response
        return res.status(200).json({ message: "Email send success", accountId: accountVerify.user_account.id });
    }
    catch (err) {
        return res.status(400).json({ error: err.message });
    }
}));
//--------------------------------------------------------------------------------//
//express auth reset password confirm route
authRoute.post('/confirmResetPass/:resetCode/:accountId', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const resetCode = req.params.resetCode;
    const accountId = req.params.accountId;
    const newPassword = (req.body.newPassword === req.body.newPasswordConfirm) ? req.body.newPassword : null;
    //check new Password
    if (!newPassword || newPassword.length < 9)
        return res.status(400).json({ error: "Invalid New Password." });
    //check refresh code
    try {
        const registeredCode = yield dataPool.account.findUnique({
            where: {
                id: parseInt(accountId)
            },
            select: {
                id: true,
                reset_code: true
            }
        });
        if (resetCode !== (registeredCode === null || registeredCode === void 0 ? void 0 : registeredCode.reset_code))
            return res.status(400).json({ error: "Code does not match." });
        //input new password
        const hashedPassword = yield bcryptjs_1.default.hash(newPassword, 10);
        const callback = yield dataPool.account.update({
            where: {
                id: registeredCode.id
            },
            data: {
                password: hashedPassword,
                reset_code: null
            },
            select: {
                id: true
            }
        });
        return res.json({ success: "Successfully changed password." });
    }
    catch (error) {
        return res.status(400).json({ error: error.message });
    }
}));
authRoute.get('/load-locations', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const existLocation = yield dataPool.locations.findFirst({
        where: {
            id: {
                gte: 0
            }
        }
    });
    if (existLocation)
        return res.status(400).json({ message: "Table already exist." });
    try {
        const setupLocations = yield dataPool.locations.createMany({
            data: PhilLocations_1.default,
            skipDuplicates: true
        });
        return res.status(200).json({ success: `${setupLocations.count} locations inserted.` });
    }
    catch (err) {
        return res.status(400).json({ error: err.message });
    }
}));
authRoute.post('/suggestLocation', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const cityQuery = req.body.city;
    const provinceQuery = req.body.province;
    if (!cityQuery && !provinceQuery)
        return res.status(400).json({ error: "Invalid parameters." });
    try {
        const locations = yield dataPool.locations.findMany({
            where: {
                city: cityQuery != null ? {
                    contains: cityQuery
                } : undefined,
                province: provinceQuery != null ? {
                    contains: provinceQuery
                } : undefined
            },
            select: {
                city: true,
                province: true
            }
        });
        return res.status(200).json({ data: locations });
    }
    catch (err) {
        return res.status(400).json({ error: err.message });
    }
}));
authRoute.post('/addLocation', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const cityQuery = req.body.city;
    const provinceQuery = req.body.province;
    if (!cityQuery || !provinceQuery)
        return res.status(400).json({ error: "City and Province is required." });
    try {
        const newLocation = yield dataPool.locations.create({
            data: {
                city: cityQuery,
                province: provinceQuery
            },
            select: {
                city: true,
                province: true
            }
        });
        return res.status(200).json({ data: newLocation });
    }
    catch (err) {
        return res.status(400).json({ error: err.message });
    }
}));
const Schema = new graphql_1.GraphQLSchema({
    query: rootQueryMutation_1.RootQuery,
    mutation: rootQueryMutation_1.RootMutation
});
authRoute.use('/graphql', checkCredentials, (0, express_graphql_1.graphqlHTTP)(req => ({
    schema: Schema,
    context: req.user,
    graphql: false
})));
exports.default = authRoute;
//# sourceMappingURL=authentication.js.map