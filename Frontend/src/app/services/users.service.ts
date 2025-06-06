import { EntityFile } from "../models/DataEntities/entityObjects.model";
import { environment } from "../../environments/environment";
import { ClientsConnections } from "../models/ActivityMonitoring/clientsConnections.model";
import { Injectable } from "@angular/core";
import * as Parse from 'parse';
import { ParseDataService } from "./data.service";
import { ParseRoleManger } from "./roles.service";
import { ParseFileService } from "./files.service";
import { IEntity } from "../models/DataEntities/entity.interface"; 
import { Classnames } from "../common/classnames.model";
import { Customer } from "../models/customers.model";


export class User extends Parse.User {
    username?: string;
    email?: string;
    password?: string;
    role?: string;
    entity?: IEntity;
    profilePicture?: EntityFile;
    personalSettings?: { [key: string]: string };
    disabled?: boolean;
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
    currentSession?: Parse.Session;
    constructor(protected _roleService: ParseRoleManger, protected _fileService: ParseFileService) {
        Parse.initialize(`${environment.APPLICATION_ID}`, `${environment.JAVASCRIPT_KEY}`);  // use your appID & your js key
        /*(Parse as any).serverURL = `${environment.parseUrl}`; // use your server url
        (Parse as any).liveQueryServerURL = `${environment.LIVE_QUERY_SERVER}`;*/
    }

    protected mapParseUserToUser(user: Parse.User) {
        let mappedUser: User = new User();
        mappedUser.email = user.getEmail();
        mappedUser.username = user.getUsername();
        mappedUser.role = user.get("role");
        mappedUser.entity = user;
        (mappedUser as any).id = user.id;
        mappedUser.profilePicture = user.get("profilePicture");
        return mappedUser;
    }

    async signup(username: string, password: string, email: string) {
        let user = new Parse.User();
        user.set("username", username);
        user.set("password", password);
        user.set("email", email);
        console.log("User before signUp", user);
        user = await user.signUp();
        /*const rolesQuery = new Parse.Query(Parse.Role);
        rolesQuery.equalTo("name", role);
        let roles = await rolesQuery.find();
        
        for (let role of roles as Parse.Role[]) {
            role.getUsers().add(user);
            role.save();
        }*/
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

     public async getActiveUsersByCustomerRole(relatedCustomer: Customer): Promise<User[]> {
        let params = { relatedCustomer: relatedCustomer.entity.id }
        let users = (await Parse.Cloud.run("getUsersByCustomerRole", params)) as Parse.User[]
        let mappedUser = await Promise.all(users.map(user => this.mapParseUserToUser(user)));
        let activeUsers = mappedUser.filter(user => user.disabled !== true);
        return activeUsers;
    }

    public async getInternalUsers(): Promise<User[]> {
        return (await (await new Parse.Query(Parse.Role).equalTo("name", "SC").first())?.getUsers().query().notEqualTo("disabled", true).find())?.map(x => this.mapParseUserToUser(x)) as User[];
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
            file = (user as any).get("profilePicture") as Parse.File;
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
        return undefined;
    }

    public async getUserSetting(user: User, settingsName: string) {
        const userQuery = new Parse.Query(Parse.User);
        user = this.mapParseUserToUser(await userQuery.get((user.entity ?? user).id));
        if (user.personalSettings && user.personalSettings[settingsName])
            return JSON.parse(user.personalSettings[settingsName]);
        return undefined;
    }

    public async updateUserSettings(user: User, settingsName: string, settings: any) {
        const userQuery = new Parse.Query(Parse.User);
        userQuery.includeAll();
        const userFetched = await userQuery.get(((user.entity ?? user) as Parse.User).id);
        let personalSettings = userFetched.get("personalSettings");
        if (!personalSettings) {
            personalSettings = {};
        }
        personalSettings[settingsName] = JSON.stringify(settings);
        userFetched.set("personalSettings", personalSettings);
        const userSaved = await userFetched.save();
        return this.mapParseUserToUser(userSaved);
    }

    public async addAssignmentToUser(user: User) {
        const entity = (user.entity ?? user) as Parse.Object;
        return this.mapParseUserToUser(await entity.save() as Parse.User);
    }
    public async setAssignmentAsSeen(user: User) {
        // fetch the user to get the latest assignments
        const userQuery = new Parse.Query(Parse.User);
        userQuery.includeAll();
        const userFetched = await userQuery.get((user.entity ?? user).id);

        return this.mapParseUserToUser(await userFetched.save() as Parse.User);
    }

}

@Injectable({
    providedIn: 'root'
})
export class ParseAcvityService extends ParseDataService<ClientsConnections> {
    constructor(protected _userService: ParseUserService, protected _roleManager: ParseRoleManger) {
        super(Classnames.ClientsConnections);
        this.bufferQuery = new Parse.Query(Classnames.ClientsConnections.classname);
        this.bufferQuery.select("user.username");
    }
    protected async CustomstartupBuffer(notificationMessage?: string | undefined): Promise<void> {
        return super.startupBuffer(notificationMessage);
    }
    protected async CustomafterBufferDownload(parseObjects: Parse.Object<Parse.Attributes>[]): Promise<ClientsConnections[]> {
        const mapped = await super.afterBufferDownload(parseObjects);
        return await Promise.all(mapped.map(async (connection) => {
            const avatar = await this._userService.getLatestProfilePicture(connection.user);
            connection.avatar = avatar;
            return connection;
        }));
    }

    protected async CustomafterSubUpdate(parseObject: Parse.Object<Parse.Attributes>): Promise<ClientsConnections | undefined> {
        const mapped = await super.afterSubUpdate(parseObject) as ClientsConnections;
        const avatar = await this._userService.getLatestProfilePicture(mapped.user);
        mapped.avatar = avatar;
        return mapped;
    }


    public async CustomgetBufferedData(): Promise<ClientsConnections[]> {
        const data = await super.getBufferedData();
        // sort data so that x.user.profilePicture is at the begin of the array
        return data.sort((a, b) => {
            const aHasPicture = !!a.avatar;
            const bHasPicture = !!b.avatar;

            if (aHasPicture && !bHasPicture) {
                return -1;
            }
            if (!aHasPicture && bHasPicture) {
                return 1;
            }
            return 0;
        });
    }

}