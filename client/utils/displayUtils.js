import React from 'react';
import {Link} from 'react-router-dom';
import {alertTimeout} from '../../mainroom.config';

export const displayGenreAndCategory = ({genre, category}) => (
    <React.Fragment>
        {!genre ? undefined : <span><Link to={`/genre/${genre}`}>{genre}</Link>&nbsp;</span>}
        {!category ? undefined : <Link to={`/category/${category}`}>{category}</Link>}
    </React.Fragment>
);

export const displaySuccessMessage = (component, message, callback) => {
    displayAlert(component, message, 'success', callback);
}

export const displayFailureMessage = (component, message, callback) => {
    displayAlert(component, message, 'danger', callback);
}

const displayAlert = (component, alertText, alertColor, callback) => {
    component.setState({alertText, alertColor}, () => {
        setTimeout(() => {
            component.setState({
                alertText: '',
                alertColor: ''
            });
            callback();
        }, alertTimeout);
    });
}
