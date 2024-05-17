import { EntityObject } from "../models/entityObjects.model";
import { ParseDataService } from "./data.service";
import { Injectable } from "@angular/core";
import * as Parse from 'parse';
import { User } from "./users.service";

export class Role extends EntityObject {
    name: string;
    users: User[] = [];
    roles: Role[] = [];
    relatedCustomer?: CustomElementRegistry;
}

export interface RoleManager {
    createRole(roleName: string, users?: User[], childrenRoles?: Role[], parentRole?: Role | undefined): Promise<Role>;
    addUserToRole(role: Role, user: User): User;
    changeUserRole(newRole: Role, user: User): User;
    findByName(roleName: string): Role;
}

@Injectable({
    providedIn: 'root'
})
export class ParseRoleManger extends ParseDataService<Role> implements RoleManager {
    private activeRoles: Role[];
    private activerRoles$: Promise<Role[]>;
    constructor() {
        super({ classname: "_Role", type: Role });
        this.startLiveQuery = false;
    }

    addUserToRole(role: Role, user: User): User {
        throw new Error("Method not implemented.");
    }
    findByName(roleName: string): Role {
        throw new Error("Method not implemented.");
    }
    async createRole(roleName: string, users?: User[], childrenRoles?: Role[], parentRole?: Role | undefined): Promise<Role> {
        throw new Error("Method not implemented.");
    }
    changeUserRole(newRole: Role, user: User): User {
        throw new Error("Method not implemented.");
    }

    public async getActiveRoles(): Promise<Role[]> {
        if (!this.activerRoles$) {
            this.activerRoles$ = Parse.Cloud.run('getUserRoles', {}).then(async (roles: Parse.Role[]) => {
                this.activeRoles = await Promise.all(roles.map(x => this.mapParseAttributesToEntityObject(x)));
                return this.activeRoles;
            });
        }
        if (!this.activeRoles)
            await this.activerRoles$;
        return this.activeRoles;
    }

    public async getUsersWithoutRole(roles: string[] | Role[]): Promise<User[]> {
        let roleNamesToExclude: string[];
        try {
            (roles as Role[]).forEach(role => {
                roleNamesToExclude.push(role.name);
            });
        } catch (err) {
            roleNamesToExclude = roles as string[];
        }
        throw new Error("Method not implemented.");
    }

    public async isCurrentUserACustomer() {
        if ((await this.getActiveRoles()).find(role => role.name == "SC" || role.name == 'admin' || role.name == 'supervisor')) {
            return false;
        } else {
            return true;
        }
    }
}