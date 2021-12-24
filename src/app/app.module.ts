/**
 Copyright (c) 2021-present, Eaton

 All rights reserved.

 This code is licensed under the BSD-3 license found in the LICENSE file in the root directory of this source tree and at https://opensource.org/licenses/BSD-3-Clause.
 **/
import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FlexLayoutModule } from '@angular/flex-layout';

import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatDividerModule } from '@angular/material/divider';

import { AppComponent } from './app.component';
import { PxbLogoComponent } from './components/pxb-logo/pxb-logo.component';
import { HomeComponent } from './pages/home/home.component';
import { ScrollingModule } from '@angular/cdk/scrolling';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { InfoListItemModule } from '@brightlayer-ui/angular-components';

@NgModule({
    declarations: [AppComponent, HomeComponent, PxbLogoComponent],
    imports: [
        BrowserModule,
        CommonModule,
        FlexLayoutModule,
        HttpClientModule,
        MatButtonModule,
        MatDividerModule,
        MatToolbarModule,
        MatIconModule,
        ScrollingModule,
        FormsModule,
        InfoListItemModule,
    ],
    providers: [],
    bootstrap: [AppComponent],
})
export class AppModule {}
