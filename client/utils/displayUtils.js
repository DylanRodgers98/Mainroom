import React from 'react';
import {Link} from 'react-router-dom';
import {successMessageTimeout, errorMessageTimeout} from '../../mainroom.config';

export const displayGenreAndCategory = ({genre, category}) => (
    <React.Fragment>
        {!genre ? undefined : <span><Link to={`/genre/${genre}`}>{genre}</Link>&nbsp;</span>}
        {!category ? undefined : <Link to={`/category/${category}`}>{category}</Link>}
    </React.Fragment>
);

export const displaySuccessMessage = (component, message, callback) => {
    displayAlert(component, message, 'success', successMessageTimeout, callback);
}

export const displayErrorMessage = (component, message, callback) => {
    displayAlert(component, message, 'danger', errorMessageTimeout, callback);
}

const displayAlert = (component, alertText, alertColor, timeout, callback) => {
    component.setState({alertText, alertColor}, () => {
        setTimeout(() => {
            component.setState({
                alertText: '',
                alertColor: ''
            });
            if (callback) {
                callback();
            }
        }, timeout);
    });
}
