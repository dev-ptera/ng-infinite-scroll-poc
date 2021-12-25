// @ts-nocheck
import { Component, OnInit } from '@angular/core';
import * as Colors from '@brightlayer-ui/colors';
import { ViewportService } from '../../services/viewport.service';
import { ApiService } from '../../services/api.service';
import { CollectionViewer, DataSource } from '@angular/cdk/collections';
import { BehaviorSubject, Observable, Subscription } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { BananoService, BananoWindow } from '../../services/banano.service';

export type KnownAccount = {
    address: string;
    alias: string;
};

export type ConfirmedTx = {
    address?: string;
    amount?: number;
    amountRaw?: string;
    date: string;
    hash: string;
    height: number;
    newRepresentative?: string;
    timestamp: number;
    type: string;
};

@Component({
    selector: 'app-home',
    templateUrl: './home.component.html',
    styleUrls: ['./home.component.scss'],
})
export class HomeComponent implements OnInit {
    colors = Colors;
    address: string;
    blockCount: number;
    ds: MyDataSource;
    loading = false;
    aliasMap = new Map<string, string>();

    constructor(
        private readonly _viewportService: ViewportService,
        private _apiService: ApiService,
        private _bananoService: BananoService
    ) {}

    ngOnInit(): void {
        this._apiService.getAliases().then((known) => {
            known.map((account) => {
                this.aliasMap.set(account.address, account.alias);
            });
            console.log(this.aliasMap);
        });
    }

    shortenAddress(addr: string): string {
        if (!addr) {
            return undefined;
        }
        return `${addr.substr(0, 12)}...${addr.substr(addr.length - 6, addr.length)}`;
    }

    isSmall(): boolean {
        return this._viewportService.isSmall();
    }

    async ledger(): Promise<void> {
        try {
            await this.checkLedgerOrError();
        } catch (error) {
            console.trace(error);
        }
    }

    async checkLedgerOrError(): Promise<void> {
        const ACCOUNT_INDEX = 0;
        const MAX_PENDING = 10;

        console.log(window);

        const config = window.bananocoinBananojsHw.bananoConfig;
        window.bananocoinBananojs.setBananodeApiUrl(config.bananodeUrl);
        const accountInfoElt = document.getElementById('account');
        const TransportWebUSB = window.TransportWebUSB;
        const isSupportedFlag = await TransportWebUSB.isSupported();
        console.log('connectLedger', 'isSupportedFlag', isSupportedFlag);
        if (isSupportedFlag) {
            const accountData = await window.bananocoin.bananojsHw.getLedgerAccountData(ACCOUNT_INDEX);
            console.log('connectLedger', 'accountData', accountData);
            const account = accountData.account;
            accountInfoElt.innerText = account;

            const accountInfo = await window.bananocoinBananojs.getAccountInfo(account, true);
            console.log('connectLedger', 'accountInfo', accountInfo);
            if (accountInfo.error !== undefined) {
                accountInfoElt.innerText = accountInfo.error;
            } else {
                const balanceParts = await window.bananocoinBananojs.getBananoPartsFromRaw(accountInfo.balance);
                const balanceDescription = await window.bananocoinBananojs.getBananoPartsDescription(balanceParts);
                accountInfoElt.innerText += '\nBalance ' + balanceDescription;

                if (balanceParts.raw == '0') {
                    delete balanceParts.raw;
                }

                const bananoDecimal = await window.bananocoinBananojs.getBananoPartsAsDecimal(balanceParts);
                const withdrawAmountElt = document.querySelector('#withdrawAmount') as HTMLInputElement;
                withdrawAmountElt.value = bananoDecimal;
                const withdrawAccountElt = document.querySelector('#withdrawAccount') as HTMLInputElement;
                withdrawAccountElt.value = account;
            }

            console.log('banano checkpending accountData', account);

            const pendingResponse = await window.bananocoinBananojs.getAccountsPending([account], MAX_PENDING, true);
            console.log('banano checkpending pendingResponse', pendingResponse);
            accountInfoElt.innerText += '\n';
            accountInfoElt.innerText += JSON.stringify(pendingResponse);
            const pendingBlocks = pendingResponse.blocks[account];

            const hashes = [...Object.keys(pendingBlocks)];
            if (hashes.length !== 0) {
                const specificPendingBlockHash = hashes[0];

                const accountSigner = await window.bananocoin.bananojsHw.getLedgerAccountSigner(ACCOUNT_INDEX);

                const bananodeApi = window.bananocoinBananojs.bananodeApi;
                let representative = await bananodeApi.getAccountRepresentative(account);
                if (!representative) {
                    representative = account;
                }
                console.log('banano checkpending config', config);

                const loggingUtil = window.bananocoinBananojs.loggingUtil;
                const depositUtil = window.bananocoinBananojs.depositUtil;

                accountInfoElt.innerText += '\n';
                accountInfoElt.innerText += 'CHECK LEDGER FOR BLOCK ' + specificPendingBlockHash;

                const receiveResponse = await depositUtil.receive(
                    loggingUtil,
                    bananodeApi,
                    account,
                    accountSigner,
                    representative,
                    specificPendingBlockHash,
                    config.prefix
                );

                accountInfoElt.innerText += '\n';
                accountInfoElt.innerText += JSON.stringify(receiveResponse);
            }
        }
    }

    search(): void {
        this.loading = true;
        if (this.ds) {
            this.ds.disconnect();
            this.ds = undefined;
        }
        void this._apiService.getBlockCount(this.address).then((data) => {
            this.blockCount = data.blockCount;
            this.loading = false;
            this.ds = new MyDataSource(data.blockCount, this._apiService, this.address);
        });
    }

    numberWithCommas(x: number | string): string {
        if (!x && x !== 0) {
            return '';
        }
        const parts = x.toString().split('.');
        parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
        return parts.join('.');
    }
}

export class MyDataSource extends DataSource<ConfirmedTx | undefined> {
    _length: number;
    _address: string;
    _pageSize = 200;
    _cachedData;
    _fetchedPages: Set<number>;
    _dataStream: BehaviorSubject<(ConfirmedTx | undefined)[]>;
    _subscription: Subscription;

    constructor(blockCount: number, private api: ApiService, address: string) {
        super();
        console.log('do the serarch');
        this._address = address;
        this._length = blockCount;
        this._cachedData = new Array(blockCount);
        this._fetchedPages = new Set<number>();
        this._dataStream = new BehaviorSubject<(ConfirmedTx | undefined)[]>(this._cachedData);
        this._subscription = new Subscription();
    }

    connect(collectionViewer: CollectionViewer): Observable<(ConfirmedTx | undefined)[]> {
        this._subscription.add(
            collectionViewer.viewChange.pipe(debounceTime(100)).subscribe((range) => {
                const startPage = this._getPageForIndex(range.start);
                const endPage = this._getPageForIndex(range.end - 1);
                for (let i = startPage; i <= endPage; i++) {
                    this._fetchPage(i);
                }
            })
        );
        return this._dataStream;
    }

    disconnect(): void {
        this._subscription.unsubscribe();
    }

    private _getPageForIndex(index: number): number {
        return Math.floor(index / this._pageSize);
    }

    private _fetchPage(page: number) {
        if (this._fetchedPages.has(page)) {
            return;
        }
        this._fetchedPages.add(page);
        console.log('fetching page');
        void this.api.getConfirmedTransactions(this._address, page).then((data: ConfirmedTx[]) => {
            this._cachedData.splice(page * this._pageSize, this._pageSize, ...Array.from(data));
            this._dataStream.next(this._cachedData);
        });
    }
}
