import {AppEvent} from 'app-shared/kmc-shared/app-events/app-event';

export class HideMenuEvent extends AppEvent {

    constructor()
    {
        super('HidedMenuEvent');
    }
}
