import { Component, OnInit } from '@angular/core';
import { Card, Detail, RecipientEnum } from '@ofModel/card.model';
import { Store } from '@ngrx/store';
import { AppState } from '@ofStore/index';
import * as cardSelectors from '@ofStore/selectors/card.selectors';
import { ThirdsService } from "@ofServices/thirds.service";
import { ClearLightCardSelection } from '@ofStore/actions/light-card.actions';
import { Router } from '@angular/router';
import { selectCurrentUrl } from '@ofStore/selectors/router.selectors';
import { ThirdResponse } from '@ofModel/thirds.model';
import { Map } from '@ofModel/map';
import { UserService } from '@ofServices/user.service';
import { selectIdentifier } from '@ofStore/selectors/authentication.selectors';
import { switchMap } from 'rxjs/operators';
import { Severity } from '@ofModel/light-card.model';
import { CardService } from '@ofServices/card.service';
import {Subject} from 'rxjs';
import {takeUntil} from 'rxjs/operators';

import { User } from '@ofModel/user.model';
import { id } from '@swimlane/ngx-charts';
declare const ext_form: any;

const RESPONSE_FORM_ERROR_MSG_I18N_KEY = 'response.error.form';
const RESPONSE_SUBMIT_ERROR_MSG_I18N_KEY = 'response.error.submit';
const RESPONSE_SUBMIT_SUCCESS_MSG_I18N_KEY = 'response.submitSuccess';
const RESPONSE_BUTTON_TITLE_I18N_KEY = 'response.btnTitle';


@Component({
    selector: 'of-card-details',
    templateUrl: './card-details.component.html',
    styleUrls: ['./card-details.component.scss']
})
export class CardDetailsComponent implements OnInit {

    protected _i18nPrefix: string;
    card: Card;
    user: User;
    details: Detail[];
    currentPath: any;
    responseData: ThirdResponse;
    unsubscribe$: Subject<void> = new Subject<void>();
    messages = {
        submitError: {
            display: false,
            msg: RESPONSE_SUBMIT_ERROR_MSG_I18N_KEY,
            color: 'red'
        },
        formError: {
            display: false,
            msg: RESPONSE_FORM_ERROR_MSG_I18N_KEY,
            color: 'red'
        },
        submitSuccess: {
            display: false,
            msg: RESPONSE_SUBMIT_SUCCESS_MSG_I18N_KEY,
            color: 'green'
        }
    }


    constructor(private store: Store<AppState>,
        private thirdsService: ThirdsService,
        private userService: UserService,
        private cardService: CardService,
        private router: Router) {
    }

    get responseDataExists(): boolean {
        return this.responseData != null && this.responseData != undefined;
    }

    get isActionEnabled(): boolean {
        if (!this.card.entitiesAllowedToRespond)  {
            console.log("Card error : no field entitiesAllowedToRespond");
            return false;
        }
        return this.card.entitiesAllowedToRespond.includes(this.user.entities[0]);
    }


    get i18nPrefix(): string {
        return this._i18nPrefix;
    }

    get btnColor(): string {
        return this.thirdsService.getResponseBtnColorEnumValue(this.responseData.btnColor);
    }

    get btnText(): string {
        return this.responseData.btnText ?
            this.i18nPrefix + this.responseData.btnText.key : RESPONSE_BUTTON_TITLE_I18N_KEY;
    }

    get responseDataParameters(): Map<string> {
        return this.responseData.btnText ? this.responseData.btnText.parameters : undefined;
    }

    ngOnInit() {
        this.store.select(cardSelectors.selectCardStateSelected)
            .pipe(takeUntil(this.unsubscribe$))
            .subscribe(card => {
                this.card = card;
                if (card) {
                    this._i18nPrefix = `${card.publisher}.${card.publisherVersion}.`;
                    if (card.details) {
                        this.details = [...card.details];
                    } else {
                        this.details = [];
                    }
                    this.thirdsService.queryThird(this.card.publisher, this.card.publisherVersion)
                    .pipe(takeUntil(this.unsubscribe$))
                    .subscribe(third => {
                            if (third) {
                                const state = third.extractState(this.card);
                                if (state != null) {
                                    this.details.push(...state.details);
                                }
                            }
                        },
                        error => console.log(`something went wrong while trying to fetch third for ${this.card.publisher} with ${this.card.publisherVersion} version.`)
                    );
                }
            });
        
        this.store.select(selectCurrentUrl)
            .pipe(takeUntil(this.unsubscribe$))
            .subscribe(url => {
                if (url) {
                    const urlParts = url.split('/');
                    this.currentPath = urlParts[1];
                }
            });

        this.store.select(selectIdentifier)
            .pipe(takeUntil(this.unsubscribe$))
            .pipe(switchMap(userId => this.userService.askUserApplicationRegistered(userId))).subscribe(user => {
                if(user){
                    this.user = user
                }
            },
                error => console.log(`something went wrong while trying to ask user application registered service with user id : ${id} `)
            );


    }
    closeDetails() {
        this.store.dispatch(new ClearLightCardSelection());
        this.router.navigate(['/' + this.currentPath, 'cards']);
    }

    getResponseData($event) {
        this.responseData = $event;
    }



    submitResponse() {

        let formData = {};

        var formElement = document.getElementById("opfab-form") as HTMLFormElement;
        for (let [key, value] of [...new FormData(formElement)]) {
            (key in formData) ? formData[key].push(value) : formData[key] = [value];
        }
        
        ext_form.validyForm(formData);

        if (ext_form.isValid) {

            const card: Card = {
                uid: null,
                id: null,
                publishDate: null,
                publisher: this.user.entities[0],
                publisherVersion: this.card.publisherVersion,
                process: this.card.process,
                processId: this.card.processId,
                state: this.responseData.state,
                startDate: this.card.startDate,
                endDate: this.card.endDate,
                severity: Severity.INFORMATION,
                entityRecipients: this.card.entityRecipients,
                externalRecipients: [this.card.publisher],
                title: this.card.title,
                summary: this.card.summary,
                data: formData,
                recipient: {
                    type: RecipientEnum.USER,
                    identity: 'admin'
                },
                parentCardId: this.card.uid
            }

            this.cardService.postResponseCard(card)
                .subscribe(
                    rep => {
                        if (rep['count'] == 0 && rep['message'].includes('Error')) {
                            this.messages.submitError.display = true;
                            console.error(rep);
                        
                        } else {
                            console.log(rep);
                            this.messages.formError.display = false;
                            this.messages.submitSuccess.display = true;
                        }
                    },
                    err => {
                        this.messages.submitError.display = true;
                        console.error(err);
                    }
                )

        } else {

            this.messages.formError.display = true;
            this.messages.formError.msg = (ext_form.formErrorMsg && ext_form.formErrorMsg != '') ?
                ext_form.formErrorMsg : RESPONSE_FORM_ERROR_MSG_I18N_KEY;
        }
    }

    ngOnDestroy(){
        this.unsubscribe$.next();
        this.unsubscribe$.complete();
      }
}
