import { Component, OnInit } from '@angular/core';
import { AccountOverview, BananoService } from '../../services/banano.service';
import { ApiService } from '../../services/api.service';
import { AccountService } from '../../services/account.service';
import { UtilService } from '../../services/util.service';
import * as Colors from '@brightlayer-ui/colors';

@Component({
    selector: 'app-accounts',
    templateUrl: './account.component.html',
    styleUrls: ['./account.component.scss'],
})
export class AccountComponent implements OnInit {
    loadingAccount: boolean;
    accounts: AccountOverview[] = [];
    currentIndex = 0;
    onlineReps: Set<string> = new Set();
    totalBalance: string;
    colors = Colors;

    constructor(
        private readonly _api: ApiService,
        private readonly _util: UtilService,
        private readonly _bananoService: BananoService,
        private readonly _accountService: AccountService
    ) {}

    ngOnInit(): void {
        void this.addAccount();
    }

    async addAccount(): Promise<void> {
        this.loadingAccount = true;
        const overview = await this._bananoService.getAccountInfo(this.currentIndex);
        this.accounts.push(overview);
        this.updateTotalBalance();
        this.loadingAccount = false;
        this.currentIndex++;
    }

    isOnline(address: string): boolean {
        if (this.onlineReps.size === 0) {
            return true;
        }
        return this.onlineReps.has(address);
    }

    formatRepresentative(rep: string): string {
        return this._accountService.repAliases.get(rep) || this._util.shortenAddress(rep);
    }

    updateTotalBalance(): void {
        let balance = 0;
        this.accounts.map((account) => {
            balance += account.balance;
        });
        this.totalBalance = this._util.numberWithCommas(balance, 6);
    }
}
