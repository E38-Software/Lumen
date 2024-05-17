import { Injectable } from "@angular/core";
import * as Parse from 'parse';
import { Classnames } from "../common/classnames.model";
import { ParseDataService } from "./data.service";
import { ParseRoleManger } from "./roles.service";
import { ParseFileService } from "./files.service";
import { IEntity } from "../models/entity.interface";
import { EntityFile } from "../models/entityObjects.model";

export class User extends Parse.User {
    username?: string;
    email?: string;
    password?: string;
    role?: string;
    entity: IEntity;
    profilePicture: EntityFile;
}

export interface UserService {
    signup(username: string, password: string, email: string, role: string[]): Promise<User>;
    login(username: string, password: string): Promise<User>;
    getCurrentUser(): User | undefined;
}

@Injectable({
    providedIn: 'root'
})
export class ParseUserService implements UserService {
    currentSession: Parse.Session;
    constructor(protected _authService: AuthService, protected _roleService: ParseRoleManger, protected _fileService: ParseFileService) {
        Parse.initialize(`${environment.APPLICATION_ID}`, `${environment.JAVASCRIPT_KEY}`);  // use your appID & your js key
        (Parse as any).serverURL = `${environment.parseUrl}`; // use your server url
        (Parse as any).liveQueryServerURL = `${environment.LIVE_QUERY_SERVER}`;
    }

    protected mapParseUserToUser(user: Parse.User) {
        let mappedUser: User = new User();
        mappedUser.email = user.getEmail();
        mappedUser.username = user.getUsername();
        mappedUser.role = user.get("role");
        mappedUser.entity = user;
        mappedUser.id = user.id;
        mappedUser.profilePicture = user.get("profilePicture");
        return mappedUser;
    }

    async signup(username: string, password: string, email: string, role?: string[]) {
        let user = new Parse.User();
        user.set("username", username);
        user.set("password", password);
        user.set("email", email);
        const rolesQuery = new Parse.Query(Parse.Role);
        rolesQuery.equalTo("name", role);
        let roles = await rolesQuery.find();
        user = await user.signUp();
        for (let role of roles as Parse.Role[]) {
            role.getUsers().add(user);
            role.save();
        }
        return this.mapParseUserToUser(user);
    }

    async login(username: string, password: string) {
        const user = await Parse.User.logIn(username, password);
        return this.mapParseUserToUser(user);
    }

    getCurrentUser() {
        let currentUser = Parse.User.current();
        if (currentUser)
            return this.mapParseUserToUser(currentUser);
        return undefined;
    }

    async checkSessionValidity() {
        let currentUser = await Parse.User.current();
        if (currentUser) {
            let query = new Parse.Query(Parse.User);
            return query.get(currentUser!.id).then((res) => {
                return res;
            },
                (err) => {
                    switch (err.code) {
                        case Parse.Error.INVALID_SESSION_TOKEN:
                            console.log("Invalid Session, need to log in again!")
                            Parse.User.logOut();
                            this._authService.logout();
                            window.location.reload();
                            return undefined;
                    }
                }
            );
        } else {
            return currentUser;
        }
    }

    public async checkPassword(password: string): Promise<boolean> {
        const user = Parse.User.current();
        try {
            await Parse.User.logIn(user!.getUsername()!, password);
            return true;
        } catch (error) {
            return false;
        }
    }

    public async verifyPasswod(password: string) {
        const user = Parse.User.current();
        return (Parse.User as any).verifyPassword(user?.getUsername(), password);
    }

    public logout() {
        Parse.User.logOut().then(() => {
            console.log("Logged out successfully!");
        })
    }

    public async changeProfilePicture(file: File): Promise<User> {
        const user = Parse.User.current() as Parse.User;
        const currentProfilePicture = user.get("profilePicture");
        const newProfilePicture = await this._fileService.upload(file.name, file);
        // the entity is the parse object
        user.set("profilePicture", newProfilePicture.entity);
        const savedUser = await user.save();
        return this.mapParseUserToUser(savedUser);
    }

    public async removeProfilePicture(): Promise<User> {
        const user = Parse.User.current() as Parse.User;
        user.unset("profilePicture");
        const savedUser = await user.save();
        return this.mapParseUserToUser(savedUser);
    }

    public getCurrentProfilePicture(): string {
        const user = Parse.User.current() as Parse.User;
        const profilePicture = user.get("profilePicture");
        return profilePicture.url();
    }

    public async setNewPassword(password: string) {
        const user = Parse.User.current() as Parse.User;
        user.setPassword(password);
        return await user.save();
    }

    public async setNewUsername(username: string) {
        const user = Parse.User.current() as Parse.User;
        user.setUsername(username);
        return await user.save();
    }

    public async setNewEmail(email: string) {
        const user = Parse.User.current() as Parse.User;
        user.setEmail(email);
        const res = await user.save();
        return this.mapParseUserToUser(res);
    }

    public async save(user: User) {
        return this.mapParseUserToUser(await (user.entity as Parse.User).save());
    }

    public getUserColor(user: User): string {
        return 'primary';
    }

    public async getLatestProfilePicture(user: User): Promise<string | undefined> {
        if (!user) return undefined;
        let file;
        try {
            file = user.get("profilePicture") as Parse.File;
        } catch (error) {
            file = undefined;
        }
        if (!file) {
            const entity = (user.entity ?? user) as Parse.Object;
            const parseObject = await entity.fetch();
            file = parseObject.get("profilePicture") as Parse.File;
        }
        if (file) {
            return file.url();
        }
    }
}