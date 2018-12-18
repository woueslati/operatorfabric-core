import * as fromRouter from "@ngrx/router-store";
import {RouterReducerState} from "@ngrx/router-store";
import {RouterStateUrl} from "@ofStore/shared/utils";
import {reducer as lightCardReducer, State as CardState} from "@ofStore/light-card/light-card.reducer";
import {
    reducer as authenticationReducer,
    State as AuthenticationState
} from "@ofStore/authentication/authentication.reducer";
import {ActionReducerMap, MetaReducer} from "@ngrx/store";
import {environment} from "@env/environment";
import {storeFreeze} from "ngrx-store-freeze";
import {LightCardEffects} from "@ofStore/light-card/light-card.effects";
import {CardOperationEffects} from "@ofStore/card-operation/card-operation.effects";
import {AuthenticationEffects} from "@ofStore/authentication/authentication.effects";
import {RouterEffects} from "ngrx-router";
import {initialState as routerInitialState} from "@ofStore/index-router";

export interface AppState {
    router: RouterReducerState<RouterStateUrl>;
    lightCard: CardState;
    authentication: AuthenticationState;
}

export const appEffects = [LightCardEffects, CardOperationEffects, RouterEffects,AuthenticationEffects];

export const appReducer: ActionReducerMap<AppState> = {
    router: fromRouter.routerReducer,
    lightCard: lightCardReducer,
    authentication: authenticationReducer
};

export const appMetaReducers: MetaReducer<AppState>[] = !environment.production
    ? [storeFreeze]
    : [];

export const storeConfig = {
    metaReducers: appMetaReducers,
    initialState: {
        router: routerInitialState,
    }
}