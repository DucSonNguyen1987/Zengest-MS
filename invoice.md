***Collection Invoices => Micro service de facturation***


** Sturcutre JSON de la collection invoices **



````
JSON

{
  _id: ObjectId,                // Unique => id générée par MONGODB
  invoiceNumber : String ,      // Unique 
  "invoiceDate": "Date",        // Date de la création d'Invoice
  "dueDate": "Date",            // Date limite de paiement

  // INFORMATIONS CLIENT
  
  "customerId": "String",       // Référence au client

  // Informations client dénormalisées ( figées au moment de la facturation)
  

  "customerInfo": {
    "name": "String",           // Nom du client
    "email": "String",          // Email de contact
    "phone": "String",          // Téléphone
    "address": {
      "street": "String",       // Rue et numéro
      "city": "String",         // Ville
      "postalCode": "String",   // Code postal
      "country": "String"       // Pays
    },
    "taxId": "String",          // Numéro de TVA (B2B) - nullable
    "companyName": "String"     // Nom de l'entreprise (B2B) - nullable
  },
  
  "orderId": "String",          // Référence à la commande associée (peut être nullable pour factures manuelles)


  // LIGNES DE FACTURATION 
  
  "items": [
    {
      "description": "String",  // Description de l'article
      "quantity": "Number",     // Quantité
      "unitPriceHT": "Number",  // Prix unitaire HT
      "taxRate": "Number",      // Taux de TVA en %
      "taxAmount": "Number",    // Montant de la TVA ( totalHT * taxRate)
      "totalHT": "Number",      // Total HT 
      "totalTTC": "Number"      // Total TTC
    }
  ],
  
  "totals": {
    "subtotalHT": "Number",
    "taxBreakdown": [
      {
        "taxRate": "Number",
        "taxableAmount": "Number",
        "taxAmount": "Number"
      }
    ],
    "totalTax": "Number",
    "totalTTC": "Number",
    "discount": "Number",
    "amountDue": "Number"
  },
  
  "payment": {
    "status": "String",
    "method": "String",
    "paidAmount": "Number",
    "paidDate": "Date",
    "transactionId": "String"
  },
  
  "status": "String",
  
  "notes": "String",
  
  "metadata": {
    "issuer": "String",
    "billingPeriod": "String",
    "reference": "String"
  },
  
  "createdAt": "Date",
  "updatedAt": "Date"
}
````




