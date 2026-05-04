
// Interface représentant une réservation 
export interface Reservation {
    _id: string;
    customerId: string;
    ressourceId: string;
    date: string;
    numberOfGuests: number;
    status: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED' | 'NO_SHOW';
    notes?: string;
    createdBy: string;
    createdAt: string;
    updatedBy: string;
}

// Interface représerntant la liste des réservations
export interface ReservationListResponse {
    reservations:Reservation[];
    total: number;
    limit: number;
    skip: number;
}
