'use strict';

import async = require( 'async');
import {EVCb} from "./npmlinkup";

export type Task = (cb: EVCb) => void;
export const q = async.queue<Task,any>((task, cb) => task(cb), 2);
