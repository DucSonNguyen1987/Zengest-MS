# Collection Orders => Micro service de commande

## Structure JSON de la collection order ##


```JSON


{
    _id : ObjectId,                     // Id générée par MongoDB
    orderNumber : String,               // ID unique de la commande ( ex: ORD-2026-01)

    // Références externes
    
    customerId : String,                // ID du client  (peut être null pour commandes anonymes)
    ressourceId: String,                // ID de la ressource ( optionnel)


    items : [
        {
            productId : string,        // Référence au produit
            productName : String,      // Nom du produit dénormalisé
            quantity : Number,         // Quantité commandée
            unitPrice : Number,        // Prix unitaire
            notes : String,            // Commentaires sur l'item
        }
    ],

    pricing : {
        subtotal : Number,              // Sous total de la commande
        discount: Number,               // RédRéduction éventuelle ( optionnel)
        total : Number
    },

    status : String,                    // Valeur de l'enum OredrStatus

    notes : String,                     // Notes générales sur la commande

    metadata : Object,                  // Données contextuelles libres récupérées des clients et autres micro services

    statusHistory : [
        {
            status :String,             // Statut
            timestamp : Date,           // Date du changement
            updatedBy: String,          // ID de l'utilisateur
        }
    ],

    createdAt: Date,
    updatedAt : Date
}

// Indexes

{
    orderNumber : 1                     // Unique
}
{
    customerId: 1,
    createdAt :-1
}
{
    status : -1
    createdAt: -1
}
{
    ressourceId: 1,
    status : 1
}



```

