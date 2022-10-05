import express from "express";
import { graphqlHTTP } from "express-graphql";
import { GraphQLSchema } from "graphql";
import multer from "multer";
import path from "path";
import { checkCredentials } from "../EmployeeAndAccounts/authentication";
import { addPayment, ProductArgs, PurchaseArgs, PurchaseModify, PurchaseOrders, updatePayment } from "./PurchaseClass";
import { RootMutation } from "./rootMutation";
import { RootQuery } from "./rootQuery";

let purchaseRoute = express.Router();

const Schema = new GraphQLSchema({
    query: RootQuery,
    mutation: RootMutation
});
const invoiceDIR = path.join(__dirname, '..', 'media', 'purchase', 'invoices');
const receiptDIR = path.join(__dirname, '..', 'media', 'purchase', 'receipts');

//initialize multer
const invoiceStorage = multer.diskStorage({ 
    destination: (req, file, callback) => {
        callback(null, invoiceDIR);
    },
    filename: (req, file, callback) => {
        const currDate = new Date().toISOString();
        
        callback(null, req.params.purchaseId + "_" + file.originalname);
    }
})

const uploadInvoice = multer({ storage: invoiceStorage });

const receiptStorage = multer.diskStorage({ 
    destination: (req, file, callback) => {
        callback(null, receiptDIR);
    },
    filename: (req, file, callback) => {
        const currDate = new Date().toISOString();
        
        callback(null, req.params.purchaseId + "_" + file.originalname);
    }
})

const uploadReceipt = multer({ storage: receiptStorage });

purchaseRoute.post('/record', checkCredentials, async (req, res) => {
    const purchaseInfo: PurchaseArgs | null = req.body.purchaseInfo;
    const purchasedProducts: ProductArgs[] | null = req.body.products;

    if (!purchaseInfo || !purchasedProducts) return res.status(400).json({ error: "Incomplete purchase information." });

    const recordOrder = new PurchaseOrders(purchaseInfo, purchasedProducts);
    const result = await recordOrder.addPurchase();
    if (!result || !result.status) return res.status(400).json({ error: result.message });

    return res.status(201).json({ data: result.data });
});

purchaseRoute.post('/update/:purchaseId', checkCredentials, async (req, res) => {
    const purchaseInfo: PurchaseArgs | null = req.body.purchaseInfo;
    const purchasedProducts: ProductArgs[] | null = req.body.products;
    const purchaseId: number = parseInt(req.params.purchaseId);

    if (!purchaseId || isNaN(purchaseId)) return res.status(400).json({ error: "Invalid purchase id." });
    if (!purchaseInfo || !purchasedProducts) return res.status(400).json({ error: "Incomplete purchase information." });

    const recordOrder = new PurchaseOrders(purchaseInfo, purchasedProducts);
    const result = await recordOrder.updatePurchase(purchaseId);
    if (!result || !result.status) return res.status(400).json({ error: result.message });

    return res.status(201).json({ data: result.data });
});

purchaseRoute.get('/delivered/:purchaseId', checkCredentials, async (req, res) => {
    const purchaseId: number = parseInt(req.params.purchaseId);

    if (!purchaseId || isNaN(purchaseId)) return res.status(400).json({ error: "Invalid purchase id." });
    const deliverOrder = new PurchaseModify(purchaseId);
    const result = await deliverOrder.setDelivered();

    if (!result || !result.status) return res.status(400).json({ error: result.message });

    return res.status(201).json({ data: result.data });
});

purchaseRoute.get('/cancel/:purchaseId', checkCredentials, async (req, res) => {
    const purchaseId: number = parseInt(req.params.purchaseId);

    if (!purchaseId || isNaN(purchaseId)) return res.status(400).json({ error: "Invalid purchase id." });
    const deliverOrder = new PurchaseModify(purchaseId);
    const result = await deliverOrder.setInactive();

    if (!result || !result.status) return res.status(400).json({ error: result.message });

    return res.status(201).json({ data: result.data });
});

purchaseRoute.get('/restore/:purchaseId', checkCredentials, async (req, res) => {
    const purchaseId: number = parseInt(req.params.purchaseId);

    if (!purchaseId || isNaN(purchaseId)) return res.status(400).json({ error: "Invalid purchase id." });
    const deliverOrder = new PurchaseModify(purchaseId);
    const result = await deliverOrder.setActive();

    if (!result || !result.status) return res.status(400).json({ error: result.message });

    return res.status(201).json({ data: result.data });
});

purchaseRoute.get('/delete/:purchaseId', checkCredentials ,async (req, res) => {
    const purchaseId: number = parseInt(req.params.purchaseId);

    if (!purchaseId || isNaN(purchaseId)) return res.status(400).json({ error: "Invalid purchase id." });
    const deliverOrder = new PurchaseModify(purchaseId);
    const result = await deliverOrder.deletePurchase();

    if (!result || !result.status) return res.status(400).json({ error: result.message });

    return res.status(201).json({ data: result.data });
});

purchaseRoute.post('/payment/:purchaseId', checkCredentials, async (req, res) => {
    const purchaseId: number = parseInt(req.params.purchaseId);
    const paymentBody: { account_id: number, amount_paid: number } = req.body.paymentInfo;

    if (!purchaseId || isNaN(purchaseId)) return res.status(400).json({ error: "Invalid purchase id." });
    const result = await addPayment(purchaseId, paymentBody.account_id, paymentBody.amount_paid);

    if (!result || !result.status) return res.status(400).json({ error: result.message });

    return res.status(201).json({ data: result.data });
})

purchaseRoute.post('/payment/update/:paymentId', checkCredentials, async (req, res) => {
    const paymentId: number = parseInt(req.params.paymentId);
    const paymentBody: { amount_paid: number } = req.body.paymentInfo;

    if (!paymentId || isNaN(paymentId)) return res.status(400).json({ error: "Invalid purchase id." });
    const result = await updatePayment(paymentId, paymentBody.amount_paid);

    if (!result || !result.status) return res.status(400).json({ error: result.message });

    return res.status(201).json({ data: result.data });
})

purchaseRoute.post('/upload/invoice/:purchaseId', checkCredentials, uploadInvoice.single('file'), async (req, res) => {
    const purchaseId: number = parseInt(req.params.purchaseId);

    if (!purchaseId || isNaN(purchaseId)) return res.status(400).json({ error: "Invalid purchase id." });
    if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "Failed to upload file."
        });
    } else {
        const upload = new PurchaseModify(purchaseId);
        const result = await upload.uploadInvoice(req.file.filename);
        if (!result || !result.status) return res.status(400).json({ error: result.message });

        return res.status(201).json({ data: result.data });
    }
});

purchaseRoute.post('/upload/receipt/:purchaseId', checkCredentials, uploadReceipt.single('file'), async (req, res) => {
    const purchaseId: number = parseInt(req.params.purchaseId);

    if (!purchaseId || isNaN(purchaseId)) return res.status(400).json({ error: "Invalid purchase id." });
    if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "Failed to upload file."
        });
    } else {
        const upload = new PurchaseModify(purchaseId);
        const result = await upload.uploadReceipt(req.file.filename);
        if (!result || !result.status) return res.status(400).json({ error: result.message });

        return res.status(201).json({ data: result.data });
    }
});

purchaseRoute.use('/invoices', express.static(invoiceDIR));
purchaseRoute.use('/receipts', express.static(receiptDIR))

purchaseRoute.use('/graphql', checkCredentials, graphqlHTTP(req => ({ 
    schema: Schema,
    context: (req as express.Request).user,
    graphql: false
})));

export default purchaseRoute;