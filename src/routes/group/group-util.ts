
import * as express from "express";
import { StdSession } from "utils/StdSession";
import { Group } from "../../Model/Group";

export function CreateGroupUpdateTask(
    todo: (group: Group, ...args: Parameters<express.RequestHandler>) => void
): express.RequestHandler {

    return (req, res, next) => {
        const session = req.session as StdSession;
        const { user } = session;

        Group.findOne({
            where: {
                groupId: req.body.groupId
            }
        }).then(group => {
            if (!group) {
                res.json({
                    code: 404
                });
            } else if (group.isOwner(user.username)) {
                todo(group, req, res, next);

                group.save().then(() => {
                    res.json({ code: 200, data: group, msg: 'updated' });
                }).catch(next);
            } else {
                res.json({
                    code: 403
                });
            }
        }).catch(next);
    }
}
