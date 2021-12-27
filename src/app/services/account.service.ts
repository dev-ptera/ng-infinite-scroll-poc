import { Injectable } from '@angular/core';
import { AccountOverview } from './banano.service';
import { ApiService } from './api.service';

@Injectable({
    providedIn: 'root',
})
export class AccountService {
    accounts: AccountOverview[] = [];
    onlineRepresentatives: Set<string> = new Set();
    repAliases: Map<string, string> = new Map<string, string>();

    constructor(private readonly _api: ApiService) {}

    fetchOnlineRepresentatives(): void {
        this._api
            .getOnlineReps()
            .then((reps) => {
                this.onlineRepresentatives = new Set(reps);
            })
            .catch((err) => {
                console.error(err);
            });
    }

    fetchRepresentativeAliases(): void {
        this._api
            .getAliases()
            .then((knownAccounts) => {
                knownAccounts.map((account) => {
                    this.repAliases.set(account.address, account.alias);
                });
            })
            .catch((err) => {
                console.error(err);
            });
    }
}
