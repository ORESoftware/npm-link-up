'use strict';

import async = require( 'async');
import {EVCb} from "./index";

export type Task = (cb: EVCb<any>) => void;
export const q = async.queue<Task,any>((task, cb) => task(cb), 2);
