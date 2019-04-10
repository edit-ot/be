import * as express from "express";
import * as qr from "qr-image";

const router = express.Router();

export default router;

// QR Image 
router.get('/:text', (req, res) => 
    qr.image(req.params.text || '', 'M').pipe(res));
