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
const express_1 = __importDefault(require("express"));
const express_graphql_1 = require("express-graphql");
const graphql_1 = require("graphql");
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const authentication_1 = require("../EmployeeAndAccounts/authentication");
const PurchaseClass_1 = require("./PurchaseClass");
const rootMutation_1 = require("./rootMutation");
const rootQuery_1 = require("./rootQuery");
let purchaseRoute = express_1.default.Router();
const Schema = new graphql_1.GraphQLSchema({
    query: rootQuery_1.RootQuery,
    mutation: rootMutation_1.RootMutation
});
const invoiceDIR = path_1.default.join(__dirname, '..', 'media', 'purchase', 'invoices');
const receiptDIR = path_1.default.join(__dirname, '..', 'media', 'purchase', 'receipts');
//initialize multer
const invoiceStorage = multer_1.default.diskStorage({
    destination: (req, file, callback) => {
        callback(null, invoiceDIR);
    },
    filename: (req, file, callback) => {
        const currDate = new Date().toISOString();
        callback(null, req.params.purchaseId + "_" + file.originalname);
    }
});
const uploadInvoice = (0, multer_1.default)({ storage: invoiceStorage });
const receiptStorage = multer_1.default.diskStorage({
    destination: (req, file, callback) => {
        callback(null, receiptDIR);
    },
    filename: (req, file, callback) => {
        const currDate = new Date().toISOString();
        callback(null, req.params.purchaseId + "_" + file.originalname);
    }
});
const uploadReceipt = (0, multer_1.default)({ storage: receiptStorage });
purchaseRoute.post('/record', authentication_1.checkCredentials, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const purchaseInfo = req.body.purchaseInfo;
    const purchasedProducts = req.body.products;
    if (!purchaseInfo || !purchasedProducts)
        return res.status(400).json({ error: "Incomplete purchase information." });
    const recordOrder = new PurchaseClass_1.PurchaseOrders(purchaseInfo, purchasedProducts);
    const result = yield recordOrder.addPurchase();
    if (!result || !result.status)
        return res.status(400).json({ error: result.message });
    return res.status(201).json({ data: result.data });
}));
purchaseRoute.post('/update/:purchaseId', authentication_1.checkCredentials, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const purchaseInfo = req.body.purchaseInfo;
    const purchasedProducts = req.body.products;
    const purchaseId = parseInt(req.params.purchaseId);
    if (!purchaseId || isNaN(purchaseId))
        return res.status(400).json({ error: "Invalid purchase id." });
    if (!purchaseInfo || !purchasedProducts)
        return res.status(400).json({ error: "Incomplete purchase information." });
    const recordOrder = new PurchaseClass_1.PurchaseOrders(purchaseInfo, purchasedProducts);
    const result = yield recordOrder.updatePurchase(purchaseId);
    if (!result || !result.status)
        return res.status(400).json({ error: result.message });
    return res.status(201).json({ data: result.data });
}));
purchaseRoute.get('/delivered/:purchaseId', authentication_1.checkCredentials, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const purchaseId = parseInt(req.params.purchaseId);
    if (!purchaseId || isNaN(purchaseId))
        return res.status(400).json({ error: "Invalid purchase id." });
    const deliverOrder = new PurchaseClass_1.PurchaseModify(purchaseId);
    const result = yield deliverOrder.setDelivered();
    if (!result || !result.status)
        return res.status(400).json({ error: result.message });
    return res.status(201).json({ data: result.data });
}));
purchaseRoute.get('/cancel/:purchaseId', authentication_1.checkCredentials, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const purchaseId = parseInt(req.params.purchaseId);
    if (!purchaseId || isNaN(purchaseId))
        return res.status(400).json({ error: "Invalid purchase id." });
    const deliverOrder = new PurchaseClass_1.PurchaseModify(purchaseId);
    const result = yield deliverOrder.setInactive();
    if (!result || !result.status)
        return res.status(400).json({ error: result.message });
    return res.status(201).json({ data: result.data });
}));
purchaseRoute.get('/restore/:purchaseId', authentication_1.checkCredentials, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const purchaseId = parseInt(req.params.purchaseId);
    if (!purchaseId || isNaN(purchaseId))
        return res.status(400).json({ error: "Invalid purchase id." });
    const deliverOrder = new PurchaseClass_1.PurchaseModify(purchaseId);
    const result = yield deliverOrder.setActive();
    if (!result || !result.status)
        return res.status(400).json({ error: result.message });
    return res.status(201).json({ data: result.data });
}));
purchaseRoute.get('/delete/:purchaseId', authentication_1.checkCredentials, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const purchaseId = parseInt(req.params.purchaseId);
    if (!purchaseId || isNaN(purchaseId))
        return res.status(400).json({ error: "Invalid purchase id." });
    const deliverOrder = new PurchaseClass_1.PurchaseModify(purchaseId);
    const result = yield deliverOrder.deletePurchase();
    if (!result || !result.status)
        return res.status(400).json({ error: result.message });
    return res.status(201).json({ data: result.data });
}));
purchaseRoute.post('/payment/:purchaseId', authentication_1.checkCredentials, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const purchaseId = parseInt(req.params.purchaseId);
    const paymentBody = req.body.paymentInfo;
    if (!purchaseId || isNaN(purchaseId))
        return res.status(400).json({ error: "Invalid purchase id." });
    const result = yield (0, PurchaseClass_1.addPayment)(purchaseId, paymentBody.account_id, paymentBody.amount_paid);
    if (!result || !result.status)
        return res.status(400).json({ error: result.message });
    return res.status(201).json({ data: result.data });
}));
purchaseRoute.post('/payment/update/:paymentId', authentication_1.checkCredentials, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const paymentId = parseInt(req.params.paymentId);
    const paymentBody = req.body.paymentInfo;
    if (!paymentId || isNaN(paymentId))
        return res.status(400).json({ error: "Invalid purchase id." });
    const result = yield (0, PurchaseClass_1.updatePayment)(paymentId, paymentBody.amount_paid);
    if (!result || !result.status)
        return res.status(400).json({ error: result.message });
    return res.status(201).json({ data: result.data });
}));
purchaseRoute.post('/upload/invoice/:purchaseId', authentication_1.checkCredentials, uploadInvoice.single('file'), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const purchaseId = parseInt(req.params.purchaseId);
    if (!purchaseId || isNaN(purchaseId))
        return res.status(400).json({ error: "Invalid purchase id." });
    if (!req.file) {
        return res.status(400).json({
            success: false,
            message: "Failed to upload file."
        });
    }
    else {
        const upload = new PurchaseClass_1.PurchaseModify(purchaseId);
        const result = yield upload.uploadInvoice(req.file.filename);
        if (!result || !result.status)
            return res.status(400).json({ error: result.message });
        return res.status(201).json({ data: result.data });
    }
}));
purchaseRoute.post('/upload/receipt/:purchaseId', authentication_1.checkCredentials, uploadReceipt.single('file'), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const purchaseId = parseInt(req.params.purchaseId);
    if (!purchaseId || isNaN(purchaseId))
        return res.status(400).json({ error: "Invalid purchase id." });
    if (!req.file) {
        return res.status(400).json({
            success: false,
            message: "Failed to upload file."
        });
    }
    else {
        const upload = new PurchaseClass_1.PurchaseModify(purchaseId);
        const result = yield upload.uploadReceipt(req.file.filename);
        if (!result || !result.status)
            return res.status(400).json({ error: result.message });
        return res.status(201).json({ data: result.data });
    }
}));
purchaseRoute.use('/invoices', express_1.default.static(invoiceDIR));
purchaseRoute.use('/receipts', express_1.default.static(receiptDIR));
purchaseRoute.use('/graphql', authentication_1.checkCredentials, (0, express_graphql_1.graphqlHTTP)(req => ({
    schema: Schema,
    context: req.user,
    graphql: false
})));
exports.default = purchaseRoute;
//# sourceMappingURL=purchaseRoute.js.map