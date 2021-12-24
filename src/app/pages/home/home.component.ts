import { Component, OnInit } from '@angular/core';
import * as Colors from '@brightlayer-ui/colors';
import { ViewportService } from '../../services/viewport.service';
import { ApiService } from '../../services/api.service';
import { CollectionViewer, DataSource } from '@angular/cdk/collections';
import { BehaviorSubject, Observable, Subscription } from 'rxjs';
import { debounceTime } from 'rxjs/operators';

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

    items = Array.from({ length: 100000 }).map((_, i) => `Item #${i}`);

    constructor(private readonly _viewportService: ViewportService, private _apiService: ApiService) {}

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
