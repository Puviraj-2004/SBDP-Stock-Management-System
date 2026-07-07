DELETE FROM "PaymentAllocation" pa
USING "Payment" p
WHERE pa."paymentId" = p."id"
  AND p."method" = 'cheque'
  AND p."chequeStatus" = 'pending';
