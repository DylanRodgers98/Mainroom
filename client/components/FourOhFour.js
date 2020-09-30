import React from "react";
import {Link} from "react-router-dom";
import {Button} from "reactstrap";

export default class FourOhFour extends React.Component {

    render() {
        return (
            <div className='text-center mt-5'>
                <h1>404 Page Not Found</h1>
                <h3>Sorry! The page you tried to visit could not be found</h3>
                <Button className='btn-dark' tag={Link} to='/'>
                    Go Home
                </Button>
            </div>
        )
    }

}