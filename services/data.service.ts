import { environment } from "src/environments/environment";
import * as Parse from 'parse';
import { EntityFile, EntityObject, EntityRelation } from "../models/DataEntities/entityObjects.model";
import { User } from "./users.service";
import * as EventEmitter from "events";
import { IEntity } from "../models/DataEntities/entity.interface";
import { Classnames, EntityObjectDefinition } from "../common/classnames.model";


export interface DataInterface<T extends EntityObject> {
  /**
   * It simply queries for al the objects of the ```type T```, no includes
   * @returns a ```list``` of objects of ```type T```
   */
  getAll(): Promise<T[]>;
  /**
   * It queries for all the elements of this class, including all the relations.
   * @returns a list of objects of ```type T```
   */
  getAllWithSubclasses(): Promise<T[]>;
  getAllWithIncludes(include: string[]): Promise<T[]>;
  /**
   *
   * @param entityObject the object we want to save. It **must be** from a **class extending EntityObject** (which contains an entity object implementing ```IEntity``` interface)
   * @returns the same object but with the IEntity property updated accordingly to the backend
   */
  save(entityObject: T): Promise<T>;
  /**
   *
   * @param entityObject the ```EntityObject``` that should be deleted from the database
   * @returns the delete object
   */
  destroy(entityObject: T): void;
  /**
   *
   * @param entityObject the ```EntityObject``` to update accordingly to fresher informations on the DB
   * @returns the refreshed object
   */
  fetch(entityObject: T): Promise<T>;
  /**
   * It can be used also as a harder fetch, including all the sub attributes and not only the main object
   * @param id the id of the object to download from the db
   * @returns the object with all the includes
   */
  getFullObjectById(id: any): Promise<T>;
  getFullObjectByIdWithIncludes(id: string, include: (keyof T)[]): Promise<T | undefined>
  /**
   * ### Use Case
   * Since working with typescripts' deep copy would simply copy the object itself,
   * whenever i need a 
  
  
  
  
  d object on the db too this function must be called.
   * #### Use Case Example
   * For example, let's save i have ```Obj1: EntityObject``` istance and i want a ```Obj2: EntityObject``` istance that is
   * exactly identical to ```Obj1```, but that i can change independently so that any change made to ```Obj2``` won't
   * affect ```Obj1```.
   *
   * If i did something like:
   * ```
   * let Obj2: EntityObject = {...Obj1};
   * ```
   * i'd copy the full ```Obj1``` into ```Obj2```, also the ```entity: IEntity``` attribute.
   *
   * But since ```entity``` is used by the data service for tracking what object the istance is related to
   * on the db, calling ```dataService.save(Obj2);``` would make dataservice work with the exact same entity
   * as ```Obj1``` thus affecting also ```Obj1```. In this scenario, you make think of ```Obj1``` and ```Obj2``` as 2 pointers
   * to the same db record.
   *
   * If i want to ```Obj2``` to be a completely new and indipendent, object we need it to omit the ```entity``` field during
   * the copy. Since the programmer should not care about this detail when working with this architecture,
   * he can simply do the following call:
   * ```
   * let Obj2: EntityObject = dataService.duplicate(Obj1);
   * ```
   * Now ```Obj2``` is a new object missing entity attribute, which will be assigned after the first ```dataService.save()``` call like
   * if we just did a ```new EntityObject();``` call.
   * @param entityObject (param entityObject) the EntityObject to duplicate
   * @returns the new duplicated object, missing the entity field.
   */
  duplicate(entityObject: T): Promise<T>;

  fetchById(id: string): Promise<T>;

  setACLByActiveUser(entityObject: T): Promise<T>;
  setACLByRole(role: string): Promise<T>;
}

export type CustomMappingFunction<T extends EntityObject | T[]> = (parseElement: Parse.Object<Parse.Attributes> | Parse.Object<Parse.Attributes>[]) => T | T[];
export type CustomAttributesMapping<T0 extends EntityObject> = {
  [K in keyof T0]?: CustomMappingFunction<any>;
};
/**
 * Data interface implementation for Parse Server
 */
export class ParseDataService<T extends EntityObject> implements DataInterface<T> {
  protected classType: { new(): T };
  protected classname: string;


  protected initialBufferQuery: Parse.Query | undefined;
  protected bufferQuery: Parse.Query | undefined;

  protected bufferQuery$: Promise<Parse.Object<Parse.Attributes>[]>;

  protected bufferSuccessMessage: string;
  protected bufferStarted: boolean = false;

  protected dataBuffer: { [key: string]: T };
  protected dataBuffer$: Promise<void>;

  protected skipInitialQuery: boolean = false;

  protected fullyFetchedBuffer: { [key: string]: boolean };

  private parseSubscription: Parse.LiveQuerySubscription;
  protected externalSubscription: EventEmitter;
  protected startLiveQuery?: boolean = true;
  protected lazyLoad?: boolean = true;
  protected lazyLoadDone: boolean = false;

  protected defaultTreeLimit: number = 2;

  protected queryLimit = 100000;

  public constructor(entityClass: EntityObjectDefinition<T>) {
    Parse.initialize(`${environment.APPLICATION_ID}`, `${environment.JAVASCRIPT_KEY}`);  // use your appID & your js key
    (Parse as any).serverURL = `${environment.parseUrl}`; // use your server url
    (Parse as any).liveQueryServerURL = `${environment.LIVE_QUERY_SERVER}`;
    Parse.enableLocalDatastore();
    this.classType = entityClass.type;
    this.classname = entityClass.classname;

    this.bufferQuery = new Parse.Query(this.classname);
    this.bufferQuery.includeAll();
    this.bufferQuery.exclude("ACL");
    this.bufferQuery.exclude("unverified");

    if (this.startLiveQuery)
      this.externalSubscription = new EventEmitter();
  }

  protected async afterBufferDownload(parseObjects: Parse.Object[]): Promise<T[]> {
    return this.mapParseArrayOfAttributesToEntityObject(parseObjects, 0, this.defaultTreeLimit);
  }
  protected async afterSubUpdate(parseObject: Parse.Object): Promise<T | undefined> {
    // console.debug("Aggiornamento", this.classname, parseObject);
    return this.mapParseAttributesToEntityObject(parseObject, 0, this.defaultTreeLimit);
  }

  protected async startupBuffer(notificationMessage?: string): Promise<void> {
    if (this.bufferStarted) {
      if (!this.dataBuffer$) {
        // wait untile this.dataBuffer$ is neither null or undefined
        await new Promise((resolve) => {
          const interval = setInterval(() => {
            if (this.dataBuffer$ != undefined && this.dataBuffer$ != null) {
              clearInterval(interval);
              resolve("");
            }
          }, 100);
        })
      }
      return this.dataBuffer$;
    }
    this.bufferStarted = true;
    if (!this.bufferQuery)
      return;
    const currentUser = Parse.User.current();
    if (!currentUser) {
      return;
    }
    const activeSessionToken: string = currentUser.getSessionToken();

    if (!this.parseSubscription) {
      this.parseSubscription = await this.bufferQuery!.subscribe(activeSessionToken);

      this.parseSubscription.on('open', (object) => {
        console.log("Livequery enabled for", this.classname);
      });
      this.parseSubscription.on('create', async (object) => {
        const updated = await this.afterSubUpdate(object);
        if (!updated)
          return;
        // this.unindexedBufferData!.push(updated);
        this.dataBuffer[updated.entity.id] = updated;
        if (this.initialBufferQuery && this.initialBufferQuery != this.bufferQuery && !this.skipInitialQuery) {
          this.fullyFetchedBuffer[updated.entity.id] = true;
        }
        this.externalSubscription.emit('create', updated);
      });
      this.parseSubscription.on('update', async (object) => {
        if (this.dataBuffer) {
          let updated = await this.afterSubUpdate(object);
          if (!updated)
            return;
          this.dataBuffer[updated.entity.id] = updated;
          if (this.initialBufferQuery && this.initialBufferQuery != this.bufferQuery && !this.skipInitialQuery) {
            this.fullyFetchedBuffer[updated.entity.id] = true;
          }
          this.externalSubscription.emit('update', updated);
        }
      });
      this.parseSubscription.on('enter', async (object) => {
        let updated = await this.afterSubUpdate(object);
        if (!updated)
          return;
        // this.unindexedBufferData!.push(updated);
        this.dataBuffer[updated.entity.id] = updated;
        if (this.initialBufferQuery && this.initialBufferQuery != this.bufferQuery && !this.skipInitialQuery) {
          this.fullyFetchedBuffer[updated.entity.id] = true;
        }
        this.externalSubscription.emit('enter', updated);
      });

      this.parseSubscription.on('leave', (object) => {
        // let index = this.unindexedBufferData!.indexOf(this.unindexedBufferData!.find(x => x.entity.id == object.id)!);
        // this.unindexedBufferData!.splice(index, 1);
        this.externalSubscription.emit('leave', this.dataBuffer[object.id]);
        delete this.dataBuffer[object.id];
        if (this.initialBufferQuery && this.initialBufferQuery != this.bufferQuery && !this.skipInitialQuery) {
          delete this.fullyFetchedBuffer[object.id];
        }
      });

      this.parseSubscription.on('delete', (object) => {
        // let index = this.unindexedBufferData!.indexOf(this.unindexedBufferData!.find(x => x.entity.id == object.id)!);
        // this.unindexedBufferData!.splice(index, 1);
        this.externalSubscription.emit('delete', this.dataBuffer[object.id]);
        delete this.dataBuffer[object.id];
        if (this.initialBufferQuery && this.initialBufferQuery != this.bufferQuery && !this.skipInitialQuery) {
          delete this.fullyFetchedBuffer[object.id];
        }
      });
    }


    if (!this.dataBuffer$) {
      if (this.skipInitialQuery) {
        this.dataBuffer$ = new Promise((resolve) => resolve());
        this.dataBuffer = {};
      } else if (!this.lazyLoad) {
        if (!this.initialBufferQuery) {
          this.bufferQuery$ = this.bufferQuery.limit(this.queryLimit).find();
        } else {
          this.bufferQuery$ = this.initialBufferQuery.limit(this.queryLimit).find();
          this.fullyFetchedBuffer = {};
        }

        this.dataBuffer$ = this.bufferQuery$.then(async (res) => {
          // this.dataBuffer = (await this.afterBufferDownload(res));
          // wait for afterBufferDownload of res and map it to this.dataBuffer using the id as key
          this.dataBuffer = {};
          const unindexedBufferData = await this.afterBufferDownload(res);
          unindexedBufferData.forEach((x) => {
            this.dataBuffer[x.entity.id] = x;
          });

          if (!notificationMessage)
            notificationMessage = this.classname;

          return;
        },
          (error) => {
            console.log("Error in startupBuffer for", this.classname, error);
            this.dataBuffer = {};
            return;
          });

      } else {

        this.dataBuffer = {};
        this.dataBuffer$ = new Promise((resolve) => resolve());

        const query = (this.initialBufferQuery ? this.initialBufferQuery : this.bufferQuery);

        query.each(async (res) => {
          const object = await this.afterSubUpdate(res);
          if (!object)
            return;
          this.dataBuffer[object.entity.id] = object;
          // wait 1 ms
          await new Promise((resolve) => setTimeout(resolve, 10));
          this.externalSubscription.emit('enter', object);
        }).then(() => {
          console.log("Lazy load for", this.classname, "completed");
          this.lazyLoadDone = true;
        }, (error) => {
          console.error("Error in lazy load for", this.classname, error);
        });
      }
    }
    return this.dataBuffer$;
  }


  protected updateAttributeOnSubscriptionUpdate<K extends keyof T, T2 extends T[K]>(attribute: K, object: T, reference: T2): T {
    object[attribute] = reference;
    return object;
  }
  protected updateAttributeOnSubscriptionDelete<K extends keyof T>(attribute: K, object: T): T {
    delete object[attribute];
    return object;
  }
  protected updateAttributeArrayOnSubscriptionUpdate<K extends keyof T, T2 extends EntityObject, T3 extends T2[]>(attribute: K, object: T, reference: T2): T {
    let arrayToUpdate = object[attribute] as T3;
    //TODO controllare se l'array sia da creare
    if (!arrayToUpdate) {
      // arrayToUpdate = [] as T2[] as T3;
      console.warn("The array on the object to update was not initialized yet.");
      return object;
    }
    let index = arrayToUpdate.findIndex(x => x.entity.id == reference.entity.id);
    if (index == -1)
      arrayToUpdate.push(reference);
    else
      arrayToUpdate[index] = reference;
    object[attribute] = arrayToUpdate as T[K];
    return object;
  }
  protected updateAttributeArrayOnSubscriptionDelete<K extends keyof T, T2 extends EntityObject, T3 extends T2[]>(attribute: K, object: T, reference: T2): T {
    let arrayToUpdate = object[attribute] as T3;
    if (!arrayToUpdate) {
      return object;
    }
    let index = arrayToUpdate.findIndex(x => x.entity.id == reference.entity.id);
    if (index != -1)
      arrayToUpdate.splice(index, 1);
    object[attribute] = arrayToUpdate as T[K];
    return object;
  }

  public async subscripeAttributeUpdate(attributeToSubscribe: keyof T,
    queryToLookAt: EventEmitter,
    findObjectToUpdateCallback: (attribute: keyof T, object: T[keyof T]) => Promise<T | undefined>) {

    queryToLookAt.on('update', async (object: T[keyof T]) => {
      let updatedObject = await findObjectToUpdateCallback(attributeToSubscribe, object);
      if (updatedObject) {
        updatedObject = this.updateAttributeOnSubscriptionUpdate(attributeToSubscribe, updatedObject, object);
        this.dataBuffer[updatedObject.entity.id] = updatedObject;
        if (this.externalSubscription)
          this.externalSubscription.emit('update', updatedObject);
      }
    });


    queryToLookAt.on('create', async (object: T[keyof T]) => {
      let updatedObject = await findObjectToUpdateCallback(attributeToSubscribe, object);
      if (updatedObject) {
        updatedObject = this.updateAttributeOnSubscriptionUpdate(attributeToSubscribe, updatedObject, object);
        this.dataBuffer[updatedObject.entity.id] = updatedObject;
        if (this.externalSubscription)
          this.externalSubscription.emit('update', updatedObject);
      }
    });

    queryToLookAt.on('enter', async (object: T[keyof T]) => {
      let updatedObject = await findObjectToUpdateCallback(attributeToSubscribe, object);
      if (updatedObject) {
        updatedObject = this.updateAttributeOnSubscriptionUpdate(attributeToSubscribe, updatedObject, object);
        this.dataBuffer[updatedObject.entity.id] = updatedObject;
        if (this.externalSubscription)
          this.externalSubscription.emit('update', updatedObject);
      }
    });

    queryToLookAt.on('delete', async (object: T[keyof T]) => {
      let updatedObject = await findObjectToUpdateCallback(attributeToSubscribe, object);
      if (updatedObject) {
        updatedObject = this.updateAttributeOnSubscriptionDelete(attributeToSubscribe, updatedObject);
        this.dataBuffer[updatedObject.entity.id] = updatedObject;
        if (this.externalSubscription)
          this.externalSubscription.emit('update', updatedObject);
      }
    });

    queryToLookAt.on('leave', async (object: T[keyof T]) => {
      let updatedObject = await findObjectToUpdateCallback(attributeToSubscribe, object);
      if (updatedObject) {
        updatedObject = this.updateAttributeOnSubscriptionDelete(attributeToSubscribe, updatedObject);
        this.dataBuffer[updatedObject.entity.id] = updatedObject;
        if (this.externalSubscription)
          this.externalSubscription.emit('update', updatedObject);
      }
    });
  }

  protected async subscripeAttributeArrayUpdate<T2 extends EntityObject, T3 extends T2[]>(attributeToSubscribe: keyof T,
    queryToLookAt: EventEmitter,
    findObjectToUpdateCallback: (attribute: keyof T, object: T2) => Promise<T | undefined>) {

    queryToLookAt.on('update', async (object: T2) => {
      let updatedObject = await findObjectToUpdateCallback(attributeToSubscribe, object);
      if (updatedObject) {
        updatedObject = this.updateAttributeArrayOnSubscriptionUpdate(attributeToSubscribe, updatedObject, object);
        this.dataBuffer[updatedObject.entity.id] = updatedObject;
        if (this.externalSubscription) {
          this.externalSubscription.emit('update', updatedObject);
          console.debug("Emitting update for", this.classname, ":", updatedObject);
        }
      }
    });


    queryToLookAt.on('create', async (object: T2) => {

      let updatedObject = await findObjectToUpdateCallback(attributeToSubscribe, object);
      if (updatedObject) {
        updatedObject = this.updateAttributeArrayOnSubscriptionUpdate(attributeToSubscribe, updatedObject, object);
        this.dataBuffer[updatedObject.entity.id] = updatedObject;
        if (this.externalSubscription) {
          this.externalSubscription.emit('update', updatedObject);
          console.debug("Emitting update for", this.classname, ":", updatedObject);
        }
      }
    });

    queryToLookAt.on('enter', async (object: T2) => {

      let updatedObject = await findObjectToUpdateCallback(attributeToSubscribe, object);
      if (updatedObject) {
        updatedObject = this.updateAttributeArrayOnSubscriptionUpdate(attributeToSubscribe, updatedObject, object);
        this.dataBuffer[updatedObject.entity.id] = updatedObject;
        if (this.externalSubscription) {
          this.externalSubscription.emit('update', updatedObject);
          console.debug("Emitting update for", this.classname, ":", updatedObject);
        }
      }
    });

    queryToLookAt.on('delete', async (object: T2) => {
      let updatedObject = await findObjectToUpdateCallback(attributeToSubscribe, object);
      if (updatedObject) {
        updatedObject = this.updateAttributeArrayOnSubscriptionDelete(attributeToSubscribe, updatedObject, object);
        this.dataBuffer[updatedObject.entity.id] = updatedObject;
        if (this.externalSubscription)
          this.externalSubscription.emit('update', updatedObject);
      }
    });

    queryToLookAt.on('leave', async (object: T2) => {

      let updatedObject = await findObjectToUpdateCallback(attributeToSubscribe, object);
      if (updatedObject) {
        updatedObject = this.updateAttributeArrayOnSubscriptionDelete(attributeToSubscribe, updatedObject, object);
        this.dataBuffer[updatedObject.entity.id] = updatedObject;
        if (this.externalSubscription)
          this.externalSubscription.emit('update', updatedObject);
      }
    });
  }

  public async getIndexedBufferedData(): Promise<{ [key: string]: T }> {
    if (!this.bufferQuery || !this.startLiveQuery) {
      let query: Parse.Query;
      if (this.initialBufferQuery)
        query = this.initialBufferQuery;
      else
        query = new Parse.Query(this.classname).includeAll();

      this.dataBuffer$ = query.find().then(async (res) => {
        let unindexedBufferData = await this.afterBufferDownload(res);
        this.dataBuffer = {};
        unindexedBufferData.forEach((x) => {
          this.dataBuffer[x.entity.id] = x;
          if (this.initialBufferQuery && this.initialBufferQuery != this.bufferQuery && !this.skipInitialQuery)
            this.fullyFetchedBuffer[x.entity.id] = true;
        });
      },
        (err) => {
          this.dataBuffer = {};
          console.error("Error in fetching info for buffer", err);
        })
      await this.dataBuffer$
      return this.dataBuffer;
    }
    await this.startupBuffer();
    return this.dataBuffer;
  }
  /**
   * 
   * @returns if **bufferQuery** iss defined, the local dataBuffer automatically updated via liveQuery. Otherwise, the local dataBuffer (no updates, **data need to be refetched manually**).
   */
  public async getBufferedData(): Promise<T[]> {
    return Object.values(await this.getIndexedBufferedData());
  }

  public async startUpLiveQuery(): Promise<void> {
    await this.startupBuffer(this.bufferSuccessMessage);
    return;
  }

  public async restartLiveQuery(full: boolean): Promise<void> {
    if (full)
      this.initialBufferQuery = undefined;
    this.bufferStarted = false;
    (this.dataBuffer$ as any) = undefined;
    (this.dataBuffer as any) = undefined;
    //TODO is this a error?
    this.skipInitialQuery = false;
    this.fullyFetchedBuffer = {};
    (this.parseSubscription as any) = undefined;
    this.externalSubscription = new EventEmitter();
    this.startLiveQuery = true;
    this.lazyLoad = false;
    this.lazyLoadDone = false;
    return await this.startUpLiveQuery();
  }

  public async getSubscription(): Promise<EventEmitter> {
    if (!this.startLiveQuery || !this.externalSubscription)
      throw new Error("LiveQuery not supposed to start");
    return this.externalSubscription;
  }

  public unsubscribeLiveQuery(): void {
    if (this.parseSubscription) {
      this.parseSubscription.unsubscribe();
      this.externalSubscription.removeAllListeners();
    }
  }


  private mapTypescriptAttributeToParseObjectAttribute(attribute: any): any {
    if (attribute instanceof EntityObject || attribute instanceof Object && attribute.entity != undefined) {
      return attribute.entity;
    }
    if (attribute instanceof EntityFile) {
      return attribute.entity;
    }
    if (attribute instanceof Parse.Object || attribute instanceof Parse.File || attribute instanceof Parse.User || attribute instanceof Parse.Role || attribute instanceof Parse.Relation) {
      return attribute;
    }
    return attribute;
  }

  /**
   * @deprecated used for retro-compatibility with old mapping only. May be usable again in the future for indexing optimization?
   * @param attribute 
   * @returns 
   */
  private checkIfIndexingIsNeeded(attribute: any) {
    if (attribute instanceof EntityObject || attribute instanceof Object && attribute.entity != undefined) {
      return true;
    }
    if (attribute instanceof EntityFile) {
      return true;
    }
    if (attribute instanceof Parse.Object || attribute instanceof Parse.File || attribute instanceof Parse.User || attribute instanceof Parse.Role) {
      return true;
    }
    return false;
  }

  private async mappings(entityObject: T): Promise<Parse.Object> {
    const entity: keyof EntityObject = 'entity';

    let parseObject;
    if (entityObject[entity]) {
      parseObject = entityObject[entity] as Parse.Object;
      if (parseObject.dirty()) {
        // need to check what keys are dirty, because the fact that i added/removed an object from a relation is ok. Otherwise it is not!
        const dirtyKeys = parseObject.dirtyKeys();
        for (let key of dirtyKeys) {
          const attribute = parseObject.get(key);
          if (attribute instanceof Parse.Relation) {
            continue;
          } else {
            // This library is not meant to modify the parse object directly, so at the moment there is no scenario that 
            // allows space for a direct change to such an object before a save.
            // If the object is dirty, something went wrong (like an error in a previous save, unexpected concurrency...).
            // parse.Object.dirty() tells us if that parse object is somehow modified, giving us a clue
            // about its validity.
            throw new Error("The object is dirty, please fetch it before saving it");
          }
        }
      }
      if (!parseObject.get("classname"))
        parseObject.set("classname", this.classname);
    } else {
      parseObject = new Parse.Object(this.classname);
      parseObject.set("classname", this.classname);
    }
    let property: keyof typeof entityObject;

    /**
     * @deprecated used for retro-compatibility with old mapping only
     */
    let entityArrayProperties: string[] = [];
    /**
     * @deprecated used for retro-compatibility with old mapping only
     */
    let entityProperties: string[] = [];

    for (property in entityObject) {
      if (property == entity) {
        continue;
      }
      if (entityObject[property] != undefined) {
        // If it were a relation, actually, we do not need to map anything. In fact, all the info are within
        // the parse object already, and therefore the only relevant info are within the relation itself already.
        if (entityObject[property] instanceof EntityRelation) {
          continue;
        }

        if (Array.isArray(entityObject[property])) {
          const parseAttributes = (entityObject[property] as any[]).map((x) => this.mapTypescriptAttributeToParseObjectAttribute(x));
          parseObject.set(property, parseAttributes);
          if ((entityObject[property] as any[]).some(x => this.checkIfIndexingIsNeeded(x))) {
            entityArrayProperties.push(property);
          }
        } else {
          const parseAttribute = this.mapTypescriptAttributeToParseObjectAttribute(entityObject[property]);
          parseObject.set(property, parseAttribute);
          if (this.checkIfIndexingIsNeeded(entityObject[property])) {
            entityProperties.push(property);
          }
        }
      }
      if (entityObject[property] == undefined) {
        // Let's check if the entity object has the property set to undefined, in that case we need to ignore it.
        // first of all unsetting a not set property is useless, and in second place, if we unset a property that was
        // not selected in a query, it will be set to undefined in the db, which is not what we want. Mattia knows it.
        if (!parseObject.has(property) || !parseObject.get(property)) {
          continue;
        }
        parseObject.unset(property);
      }
    }
    parseObject.set("entityArrayProperties", entityArrayProperties);
    parseObject.set("entityProperties", entityProperties);
    return parseObject;
  }
  /**
   *
   * @param entityObject the object we want to save. It **must be** from a **class extending EntityObject** (which contains an entity object implementing ```IEntity``` interface)
   * @returns the same object but with the ```IEntity``` property updated accordingly to the backend
   */
  async save(entityObject: T): Promise<T> {
    const parseObject = await this.mappings(entityObject);

    const savedEntity = await parseObject.save().then(async (res) => {
      return res;
    }, (err) => {
      console.error("Error in saving entity", err);
      throw err;
    });

    entityObject.entity = savedEntity;
    return entityObject as T;
  }

  /**
   *
   * @param entityObject the EntityObject that should be deleted from the database
   * @returns the delete object
   */
  async destroy(entityObject: T): Promise<T> {

    if (!entityObject.entity) {
      throw "Entity not found";
    }
    const returnValue = await (entityObject.entity as Parse.Object).destroy().then((res) => {
      return this.mapParseAttributesToEntityObject(res);
    }, (err) => {
      console.error("Error in deleting entity", err);
      throw Error("Error in deleting entity");
    });
    return returnValue;
  }

  /**
   * This is a factory, should not be used outside.
   * @returns a new IEntity object
   */
  getNewEntity(): Parse.Object {
    const parseEntity = new Parse.Object(this.classname);
    return parseEntity;
  }
  /**
   * Same as getNewEntity but with custom class
   * @param classname the classname for which we are creating a new IEntity object
   * @returns a new IEntity object
   */
  getNewCompatibleEntityOfAnyType(classname: string): Parse.Object {
    const ParseEntity = Parse.Object.extend(classname);
    return new ParseEntity();
  }

  protected mapFile(parseFile: Parse.File): EntityFile {
    let newFile: EntityFile = new EntityFile();
    newFile.name = parseFile.name();
    // newFile.data = await parseFile.getData();
    newFile.url = parseFile.url();
    newFile.entity = parseFile;
    return newFile;
  }

  protected mapParseUserToUser(user: Parse.User) {
    let mappedUser: User = new User();
    // mappedUser = {...user} as User;
    mappedUser.email = user.getEmail();
    mappedUser.username = user.getUsername();
    mappedUser.role = user.get("role");
    mappedUser.entity = user;
    mappedUser.id = user.id;
    return mappedUser;
  }

  /**
   * This function is mean to be used to map the Parse.Object<Parse.Attributes> return
   * values from a query into any model we intend to actually use in the program.
   * @param parseElement like a queried element
   * @returns a mapped model
   */
  protected mapParseAttributesToEntityObject<K extends keyof Classnames, E extends EntityObject, KE extends keyof E>(parseElement: Parse.Object<Parse.Attributes>, deepLevel: number = 0, maxDeep: number = 3, customMapping?: CustomAttributesMapping<any>): any | undefined {
    if (!parseElement)
      return undefined;
    const classname: K = parseElement.className as K;

    const classReference: EntityObjectDefinition<E> = Classnames[classname];
    if (!classReference) {
      console.error("Classname not found", classname, "for", parseElement);
      return undefined;
    }
    if (typeof classReference === "string") {
      if (classReference === "_User") {
        return this.mapParseUserToUser(parseElement as Parse.User);
      }
      else if (classReference === "File") {
        return this.mapFile(parseElement as any as Parse.File);
      }
    }
    if (!classReference.type) {
      console.error("Class type not found", classname, "for", parseElement);
      return undefined;
    }
    const m: E = new classReference.type();
    if (maxDeep != deepLevel) {
      Object.keys(parseElement.attributes).forEach((element) => {
        const property = element as KE;
        // if(m[property] == undefined){
        //   return;
        // }
        if (customMapping && customMapping[property]) {
          m[property] = customMapping[property]!(parseElement.attributes[element]) as E[KE];
        } else if (parseElement.attributes[element] instanceof Parse.File) {
          (m[property] as any) = this.mapFile(parseElement.attributes[element] as Parse.File);
        }
        else if (parseElement.attributes[element] instanceof Parse.Object) {
          m[property] = this.mapParseAttributesToEntityObject(parseElement.attributes[element] as Parse.Object, deepLevel + 1, maxDeep);
        }
        else if (parseElement.attributes[element] instanceof Array && parseElement.attributes[element].length > 0 && parseElement.attributes[element][0] instanceof Parse.Object) {
          (m[property] as any) = this.mapParseArrayOfAttributesToEntityObject(parseElement.attributes[element] as Parse.Object[], deepLevel + 1, maxDeep);
        }
        else if (parseElement.attributes[element] instanceof Parse.User) {
          (m[property] as any) = this.mapParseUserToUser(parseElement.attributes[element] as Parse.User);
        }
        else if (parseElement.attributes[element] instanceof Parse.Role) {
          (m[property] as any) = this.mapParseAttributesToEntityObject(parseElement.attributes[element] as Parse.Role, deepLevel + 1, maxDeep);
        } else if (parseElement.attributes[element] instanceof Parse.Relation) {
          const parseRelation = parseElement.attributes[element] as Parse.Relation;
          if (parseRelation.key) {
            if (element != parseRelation.key) {
              throw Error("Relation key and  Parse.Object's attribute name do not match");
            }
            const parentClass = parseRelation.parent.className as keyof Classnames;
            const childClass = parseRelation.targetClassName as keyof Classnames;

            const relation = new EntityRelation(childClass, parentClass);
            (m[property] as EntityRelation) = relation;
          }
        } else {
          m[property] = parseElement.attributes[element];
        }

      });
    }
    m["entity"] = parseElement;
    return m;
  }

  protected mapParseArrayOfAttributesToEntityObject(parseElements: Parse.Object<Parse.Attributes>[], deepLevel: number = 0, maxDeep: number = 2, customMapping?: CustomAttributesMapping<any>): any[] {
    if (maxDeep != deepLevel)
      return parseElements.map(parseElement => this.mapParseAttributesToEntityObject(parseElement, deepLevel, maxDeep, customMapping));
    else
      return parseElements;
  }

  /**
   * It simply queries for al the objects of the ```type T```, no includes
   * @returns a ```list``` of objects of ```type T```
   */
  async getAll(): Promise<T[]> {
    const numberOfStuffToDownload = await new Parse.Query(this.classname).count().then((res) => {
      return res;
    },
      (err) => {
        console.error("Canno count available objects", err);
        console.warn("Trying to download all the objects using the set default limit in the service");
        return this.queryLimit;
      });
    const query = new Parse.Query(this.classname);
    let entityObjects = await query.limit(numberOfStuffToDownload).find().then((res) => {
      return res;
    },
      (err) => {
        console.error("Cannot download all the objects", err);
        return [];
      });

    return this.mapParseArrayOfAttributesToEntityObject(entityObjects);
    // return this.dataBuffer as T[];
  }
  /**
   * It queries for all the elements of this class, including all the relations.
   * @returns a list of objects of ```type T```
   */
  async getAllWithSubclasses(): Promise<T[]> {
    const numberOfStuffToDownload = await new Parse.Query(this.classname).count().then((res) => {
      return res;
    },
      (err) => {
        console.error("Canno count available objects", err);
        console.warn("Trying to download all the objects using the set default limit in the service");
        return this.queryLimit;
      });
    const query = new Parse.Query(this.classname).includeAll();
    let entityObjects = await query.limit(numberOfStuffToDownload).find().then((res) => {
      return res;
    },
      (err) => {
        console.error("Cannot download all the objects", err);
        return [];
      });

    return this.mapParseArrayOfAttributesToEntityObject(entityObjects);
  }

  async getAllWithIncludes(include: string[]): Promise<T[]> {

    const numberOfStuffToDownload = await new Parse.Query(this.classname).count().then((res) => {
      return res;
    },
      (err) => {
        console.error("Canno count available objects", err);
        console.warn("Trying to download all the objects using the set default limit in the service");
        return this.queryLimit;
      });

    // let ts: T[] = [];
    const query = new Parse.Query(this.classname);
    for (let i of include) {
      query.include(i);
    }

    let res = await query.limit(numberOfStuffToDownload).find().then((res) => {
      return res;
    },
      (err) => {
        console.error("Cannot download all the objects", err);
        return [];
      });

    return this.mapParseArrayOfAttributesToEntityObject(res);
    // return this.dataBuffer as T[];
  }

  async fetchAll(entityObjects: T[], include: string[]): Promise<T[]> {
    let res;
    entityObjects = entityObjects.filter(x => x != undefined);
    try {
      res = await Parse.Object.fetchAllWithInclude(entityObjects.map(x => x.entity) as Parse.Object[], include).then((res) => {
        return res;
      }
      );
    } catch (err) {
      res = await Parse.Object.fetchAllWithInclude(entityObjects as any as Parse.Object[], include).then((res) => {
        return res;
      }
        // , (err) => {
        //   console.error("Cannot fetch all the objects", err);
        //   return undefined;
        // }
      );
    }
    if (!res) return entityObjects;
    return this.mapParseArrayOfAttributesToEntityObject(res);
    // return this.dataBuffer as T[];
  }

  async getAllIfNeededWithIncludes(entityObjects: T[], include: string[]): Promise<T[]> {
    let res;
    entityObjects = entityObjects.filter(x => x != undefined);
    try {
      res = await Parse.Object.fetchAllIfNeededWithInclude(entityObjects.map(x => x.entity) as Parse.Object[], include).then((res) => {
        return res;
      });
    } catch (err) {
      res = await Parse.Object.fetchAllIfNeededWithInclude(entityObjects as any as Parse.Object[], include).then((res) => {
        return res;
      });
    }
    if (!res) return entityObjects;
    return this.mapParseArrayOfAttributesToEntityObject(res);
  }

  async fetchAllObjectsIfNeeded(entityObjects: T[] | IEntity[]): Promise<T[]> {
    const fetched = await Promise.all(entityObjects.map(async (x) => {
      return await this.fetchObjectIfNeeded(x);
    }));

    // check if any object is undefined
    if (fetched.some(x => x == undefined)) {
      throw new Error("Error: Some of the objects that you're trying to fetch were not found. Object not found.");
    }

    return fetched as T[];
  }


  /**
   *
   * @param entityObject the EntityObject to update accordingly to fresher informations on the DB
   * @returns the refreshed object
   */
  async fetch(entityObject: T | IEntity): Promise<T> {
    let fetchedObject;
    if ((entityObject as T).entity) {
      fetchedObject = await ((entityObject as T).entity as Parse.Object).fetch().then((res) => {
        return res;
      },
        (err) => {
          console.error("Cannot fetch object", err);
          return undefined;
        })
    } else {
      fetchedObject = await (entityObject as IEntity as Parse.Object).fetch().then((res) => {
        return res;
      },
        (err) => {
          console.error("Cannot fetch object", err);
          return undefined;
        })
    }
    if (!fetchedObject) {
      if ((entityObject as T).entity) {
        return entityObject as T;
      } else {
        return this.mapParseAttributesToEntityObject(entityObject as IEntity as Parse.Object) as T;
      }
    }
    return this.mapParseAttributesToEntityObject(fetchedObject) as T;
  }

  /**
   * It can be used also as a harder fetch, including all the sub attributes and not only the main object.
   * getFullObjectById : fetch = DaniloFinizio : Rocco Siffredi
   * @param id the id of the object to download from the db
   * @returns the object with all the includes
   */
  async getFullObjectById(id: string): Promise<T> {
    const query = new Parse.Query(this.classname);
    let res$ = await query.includeAll().get(id).then((res) => {
      return res;
    },
      (err) => {
        // console.error("Cannot download object", err);
        return undefined;
      });

    if (!res$) throw new Error("Error: Object not found.");

    let returnValue: T = new this.classType();
    returnValue = { ... this.mapParseAttributesToEntityObject(res$, 0, 3) as T };
    return returnValue as T;
  }

  async fetchObjectByIdIfNeeded(id: string, lazyLoad?: boolean): Promise<T | undefined> {
    if (!this.dataBuffer || Object.keys(this.dataBuffer).length == 0) {
      const returnValue = await this.getFullObjectById(id);
      if (this.skipInitialQuery) { // means it's actually connected via livequery, i simply did not buffer anything in the beginning!
        this.dataBuffer = {};
        this.dataBuffer[id] = returnValue;
        if (!this.fullyFetchedBuffer)
          this.fullyFetchedBuffer = {};
        this.fullyFetchedBuffer[id] = true;
      }
      return returnValue;
    }

    let returnValue: T | undefined;
    try {
      if (
        (this.initialBufferQuery && this.initialBufferQuery != this.bufferQuery && !this.skipInitialQuery && (!this.fullyFetchedBuffer || !this.fullyFetchedBuffer[id])
          || (this.skipInitialQuery && (!this.fullyFetchedBuffer || !this.fullyFetchedBuffer[id])))
      ) {
        if (!this.fullyFetchedBuffer)
          this.fullyFetchedBuffer = {};
        returnValue = await this.getFullObjectById(id);
        if (returnValue) {
          this.fullyFetchedBuffer[id] = true;
          this.dataBuffer[id] = returnValue;
        }
      }
      returnValue = this.dataBuffer[id];
      if (!returnValue) {
        if ((!lazyLoad || this.lazyLoadDone)) {
          returnValue = await this.getFullObjectById(id);
        } else {
          return undefined;
        }
      }
    } catch (err) {
      console.warn(err);
      try {
        returnValue = await this.getFullObjectById(id);
        if (this.initialBufferQuery && this.initialBufferQuery != this.bufferQuery && !this.skipInitialQuery && returnValue) {
          if (!this.fullyFetchedBuffer)
            this.fullyFetchedBuffer = {};
          this.fullyFetchedBuffer[id] = true;
        }
      } catch (err) {
        if ((err as Error).message.includes("Object not found.")) {
          return undefined;
        }
        console.error(err);
      }
    }
    return returnValue as T;
  }


  async fetchObjectIfNeeded(entityObject: T | IEntity, lazyLoad?: boolean): Promise<T | undefined> {
    if ((entityObject as T).entity) {
      return this.fetchObjectByIdIfNeeded((entityObject as T).entity.id, lazyLoad);
    } else if ((entityObject as IEntity).id) {
      return this.fetchObjectByIdIfNeeded((entityObject as IEntity).id, lazyLoad);
    } else {
      console.warn("Fetching object without id", entityObject);
      return undefined;
    }
  }

  fetchObjectByIdLocally(id: string): T | undefined {
    let returnValue: T | undefined;
    if (!this.dataBuffer)
      return returnValue;
    returnValue = this.dataBuffer[id];
    return returnValue;
  }

  fetchObjectLocally(entityObject: T | IEntity): T | undefined {
    if (!entityObject) return undefined;
    if ((entityObject as T)?.entity) {
      return this.fetchObjectByIdLocally((entityObject as T).entity.id);
    } else if ((entityObject as IEntity).id) {
      return this.fetchObjectByIdLocally((entityObject as IEntity).id);
    } else {
      console.warn("Fetching object without id", entityObject);
      return undefined;
    }
  }

  async getFullObjectByIdWithIncludes(id: string, include: (keyof T)[], deepLevel = 2): Promise<T | undefined> {
    const query = new Parse.Query(this.classname);
    for (let i of include) {
      query.include(i as string);
    }
    let res$ = await query.get(id).then((res) => {
      return res;
    },
      (err) => {
        console.error("Cannot download object", err);
        return undefined;
      });
    if (!res$) return undefined;
    let returnValue: T = new this.classType();
    returnValue = { ... await this.mapParseAttributesToEntityObject(res$, 0, deepLevel) as T };
    if (this.dataBuffer)
      this.dataBuffer[returnValue.entity.id] = returnValue;
    if (this.initialBufferQuery && this.initialBufferQuery != this.bufferQuery && !this.skipInitialQuery && this.dataBuffer)
      this.fullyFetchedBuffer[returnValue.entity.id] = false;
    return returnValue as T;
  }

  public async fetchFullObjectWithIncludes(entityObject: T | IEntity, include: (keyof T)[], maxDeep = 2): Promise<T | undefined> {
    if ((entityObject as T).entity) {
      return this.getFullObjectByIdWithIncludes((entityObject as T).entity.id, include, maxDeep);
    } else if ((entityObject as IEntity).id) {
      return this.getFullObjectByIdWithIncludes((entityObject as IEntity).id, include, maxDeep);
    } else {
      console.warn("Fetching object without id", entityObject);
      return undefined;
    }
  }

  /**
   *
   * @param id the id of the object we want to fetch
   * @returns the fetched object
   */
  async fetchById(id: string, includes?: string[]): Promise<T> {
    let query = new Parse.Query(this.classname);
    if (includes) {
      includes.forEach(include => {
        query = query.include(include);
      });
    }
    let res$ = await query.get(id).then((res) => {
      return res;
    },
      (err) => {
        console.error("Cannot fetch object", err);
        return undefined;
      });
    if (!res$) throw new Error("Error: Object not found.");
    let returnValue: T = new this.classType();
    returnValue = { ... await this.mapParseAttributesToEntityObject(res$) as T };
    return returnValue as T;
  }

  /**
   * ### Use Case
   * Since working with typescripts' deep copy would simply copy the object itself,
   * whenever i need a duplicated object on the db too this function must be called.
   * #### Use Case Example
   * For example, let's save i have ```Obj1: EntityObject``` istance and i want a ```Obj2: EntityObject``` istance that is
   * exactly identical to ```Obj1```, but that i can change independently so that any change made to ```Obj2``` won't
   * affect ```Obj1```.
   *
   * If i did something like:
   * ```
   * let Obj2: EntityObject = {...Obj1};
   * ```
   * i'd copy the full ```Obj1``` into ```Obj2```, also the ```entity: IEntity``` attribute.
   *
   * But since ```entity``` is used by the data service for tracking what object the istance is related to
   * on the db, calling ```dataService.save(Obj2);``` would make dataservice work with the exact same entity
   * as ```Obj1``` thus affecting also ```Obj1```. In this scenario, you make think of ```Obj1``` and ```Obj2``` as 2 pointers
   * to the same db record.
   *
   * If i want to ```Obj2``` to be a completely new and indipendent, object we need it to omit the ```entity``` field during
   * the copy. Since the programmer should not care about this detail when working with this architecture,
   * he can simply do the following call:
   * ```
   * let Obj2: EntityObject = dataService.duplicate(Obj1);
   * ```
   * Now ```Obj2``` is a new object missing entity attribute, which will be assigned after the first ```dataService.save(Obj2)``` call like
   * if we just did a ```new EntityObject();``` call.
   * @param entityObject (param entityObject) the EntityObject to duplicate
   * @returns the new duplicated object, missing the entity field.
   */
  public async duplicate(entityObject: T, duplicateAttributes: boolean = false, toKeep: string[] = []): Promise<T> {
    if (!duplicateAttributes) {
      let newEntityObject = new this.classType();
      newEntityObject = { ...entityObject };
      delete (newEntityObject as any).entity;
      return newEntityObject;
    }
    const entity: keyof EntityObject = 'entity';
    let parseObject = this.getNewEntity();

    let property: keyof typeof entityObject;
    for (property in entityObject) {
      if (property == entity) {
        continue;
      }
      // check if property is among tokeep
      if (entityObject[property] && toKeep.length > 0 && toKeep.includes(property)) {
        if (!Array.isArray(entityObject[property])) {
          const value = this.mapTypescriptAttributeToParseObjectAttribute(entityObject[property]);
          parseObject.set(property, value);
        } else {
          const values = (entityObject[property] as any[]).map(x => this.mapTypescriptAttributeToParseObjectAttribute(x));
          parseObject.set(property, values);
        }
      }
      if (entityObject[property] && (toKeep.length == 0 || !toKeep.includes(property))) {
        if (Array.isArray(entityObject[property])) {
          let arr = [];
          for (let obj of (entityObject[property] as any[])) {
            if (obj.entity && obj.entity.id) {
              let newParseObj = (obj.entity as Parse.Object).clone();
              arr.push(newParseObj);
            } else {
              arr.push(obj);
            }
          }
          parseObject.set(property, arr);
        } else {
          if ((entityObject[property] as any).entity && (entityObject[property] as any).entity.id) {
            let newParseObj = ((entityObject[property] as any).entity as Parse.Object).clone();
            parseObject.set(property, newParseObj);
          } else {
            parseObject.set(property, entityObject[property]);
          }
        }
      }
    }

    parseObject = await parseObject.save();
    return this.mapParseAttributesToEntityObject(parseObject);
  }

  public simpleDuplicate(entityObject: T): T {
    entityObject = { ...entityObject };
    (entityObject as any).entity = undefined;
    return entityObject;
  }

  async setACLByActiveUser(entityObject: T): Promise<T> {
    let user = Parse.User.current();
    (entityObject.entity as Parse.Object).setACL(new Parse.ACL(user));
    const entity = await (entityObject.entity as Parse.Object).save().then((res) => {
      return res;
    },
      (err) => {
        console.error("Cannot set ACL", err);
        return undefined;
      });
    if (!entity) throw new Error("Error: Object not found.");
    entityObject.entity = entity;
    return entityObject;
  }

  setACLByRole(role: string): Promise<T> {
    throw new Error("Method not implemented.");
  }

  async saveMany(entityObjects: T[], returnMappingDeepness = 2, batchSize = 150) {
    console.log("Inizio mapping");

    const mappings$ = entityObjects.map((x) => {
      return this.mappings(x);
    });

    const entities = await Promise.all(mappings$);

    console.log("Fine mapping");
    console.log("Inizio salvataggio");
    const savedEntities: Parse.Object[] = await Parse.Object.saveAll(entities, { batchSize: batchSize }).then((res) => {
      return res;
    },
      (err) => {
        console.error("Cannot save object", err);
        throw new Error("Cannot save objects");
      });
    console.log("Fine salvataggio");
    console.log("Inizio interpretazione risposta");
    const returnValue = savedEntities.map(x => this.mapParseAttributesToEntityObject(x, 0, returnMappingDeepness));
    console.log("Termine interpretazione risposta");
    return returnValue;
  }

  async checkExistence(entityObject: T | IEntity): Promise<boolean> {
    let parseObject;
    if (entityObject instanceof EntityObject) {
      parseObject = (entityObject as EntityObject).entity as Parse.Object;
    } else {
      //check if it's istance of Parse.Object
      if (entityObject instanceof Parse.Object) {
        parseObject = entityObject as Parse.Object;
      } else {
        return false;
      }
    }
    if (!parseObject) return false;
    return await parseObject.exists();
  }

  addToRelation<T2 extends EntityObject>(entityObject: T, relationName: keyof T, elementToAdd: T2) {
    if (!entityObject[relationName]) {
      (entityObject[relationName] as EntityRelation) = new EntityRelation(elementToAdd.classname as keyof Classnames, this.classname as keyof Classnames);
    }
    const entity = entityObject.entity as Parse.Object;
    if (!entity) {
      throw Error("Cannot add to relation: entity not set yet.");
    } else {
      const entity2 = elementToAdd.entity as Parse.Object;
      if (!entity2) {
        throw Error("Cannot add to relation: elementToAdd.entity not set yet.");
      }
      if (entity2.dirty()) {
        // TODO check if this is actually needed
        throw Error("Cannot add to relation: elementToAdd.entity is dirty.");
      }
      entity.relation(relationName as string).add(entity2);
      entityObject.entity = entity;
      return entityObject;
    }
  }

  addAllToRelation<T2 extends EntityObject>(entityObject: T, relationName: keyof T, elementsToAdd: T2[]) {
    elementsToAdd.forEach(element => {
      this.addToRelation(entityObject, relationName, element);
    });
    return entityObject;
  }

  removeAllFromRelation<T2 extends EntityObject>(entityObject: T, relationName: keyof T, elementsToRemove: T2[]) {
    elementsToRemove.forEach(element => {
      this.removeFromRelation(entityObject, relationName, element);
    });
    return entityObject;
  }

  removeFromRelation<T2 extends EntityObject>(entityObject: T, relationName: keyof T, elementToRemove: T2) {
    if (!entityObject[relationName]) {
      throw Error("Cannot remove from relation: relation not found.");
    }
    const entity = entityObject.entity as Parse.Object;
    if (!entity) {
      throw Error("Cannot remove from relation: entity not set yet.");
    }
    const entity2 = elementToRemove.entity as Parse.Object;
    if (!entity2) {
      throw Error("Cannot remove from relation: elementToRemove.entity not set yet.");
    }
    if (entity2.dirty()) {
      // TODO check if this is actually needed
      throw Error("Cannot remove from relation: elementToRemove.entity is dirty.");
    }
    entity.relation(relationName as string).remove(entity2);
    entityObject.entity = entity;
    return entityObject;
  }

  async getAllFromRelation<T2 extends EntityObject>(entityObject: T, relationName: keyof T, includes?:(keyof T2)[]): Promise<T2[]> {
    const entity = entityObject.entity as Parse.Object;
    if (!entity) {
      throw Error("Cannot get from relation: entity not set yet.");
    }
    const relation = entity.relation(relationName as string);
    if (!relation) {
      throw Error("Cannot get from relation: relation not found.");
    }
    const query = relation.query();
    if(includes){
      for(let i of includes){
        query.include(i as string);
      }
    } else {
      query.includeAll();
    }
    const res = await query.find();
    return this.mapParseArrayOfAttributesToEntityObject(res) as T2[];
  }

  async getAllFromRelationWithIncludes<T2 extends EntityObject>(entityObject: T, relationName: keyof T, includes: string[]): Promise<T2[]> {
    const entity = entityObject.entity as Parse.Object;
    if (!entity) {
      throw Error("Cannot get from relation: entity not set yet.");
    }
    const relation = entity.relation(relationName as string);
    if (!relation) {
      throw Error("Cannot get from relation: relation not found.");
    }
    const query = relation.query();
    includes.forEach(element => {
      query.include(element);
    });
    const res = await query.find();
    return this.mapParseArrayOfAttributesToEntityObject(res) as T2[];
  }

  public readonly getCurrentBufferSize = () => (this.dataBuffer ? Object.keys(this.dataBuffer).length : 0);
  public readonly bufferLoadStarted = () => this.bufferStarted != undefined;
  public async getBufferQueryPromise(): Promise<Parse.Object<Parse.Attributes>[]> {
    if (this.bufferStarted) {
      // wait until this.bufferQuery$ is != undefined
      if (!this.bufferQuery$) {
        return new Promise((resolve, reject) => {
          const interval = setInterval(() => {
            if (this.bufferQuery$) {
              clearInterval(interval);
              resolve(this.bufferQuery$);
            }
          }, 100);
        });
      }
      return this.bufferQuery$;
    } else {
      this.startUpLiveQuery();
      //wait 100ms
      return new Promise((resolve, reject) => {
        const interval = setInterval(() => {
          clearInterval(interval);
          resolve(this.bufferQuery$);
        }, 100);
      });
    }
  }

  /**
   * Adds elements to an array attribute of an entity object and saves it.
   * Takes advantage of Parse's atomic operations.
   * @param entityObject the entity object to update
   * @param arrayAttribute the attribute representing the array
   * @param values the values to add to the array
   * @param unique (default true) eitehr if you want to add the values only if they are not already present in the array
   * @returns the updated and saved entity object
   */
  public async addValuesToArray(entityObject: T | IEntity, arrayAttribute: keyof T, values: T[keyof T], unique = true): Promise<T> {
    if (!entityObject) {
      throw Error("Cannot add values to array: entityObject is undefined");
    }
    if (!arrayAttribute) {
      throw Error("Cannot add values to array: arrayAttribute is undefined");
    }
    if (!Array.isArray(values)) {
      throw Error("Cannot add values to array: values is not an array");
    }

    if (!values || values.length == 0) {
      console.warn("Cannot add values to array: values is undefined or empty", entityObject, arrayAttribute, values, unique);
      return entityObject as T;
    }

    let valuesToAdd = values as any[];

    let parseObject;
    if ((entityObject as T).entity) {
      parseObject = (entityObject as T).entity as Parse.Object;
    } else {
      parseObject = entityObject as Parse.Object;
    }
    //fetching for consistency
    parseObject = await parseObject.fetch();

    //checking if values should be added as ParseObjects or not
    if (valuesToAdd.every(attribute => attribute instanceof Object && attribute.entity != undefined)) {
      valuesToAdd = valuesToAdd.map(x => x.entity) as Parse.Object[];
    } else if (valuesToAdd.some(x => x instanceof EntityObject || x instanceof EntityFile)) {
      throw Error("Cannot add values to array: values is a mix of EntityObjects and other types");
    } else {
      // if it's not entity objects, there is'nt much to do.
      // For example, if it were Parse.Object already, they can be simoply added to the array and they will be turned into pointers
    }

    // adding values to array
    if (unique) {
      parseObject.addAllUnique(arrayAttribute as string, valuesToAdd);
    } else {
      parseObject.addAll(arrayAttribute as string, valuesToAdd);
    }

    return await parseObject.save().then((res) => {
      return this.mapParseAttributesToEntityObject(res) as T;
    });
  }

  public async removeValuesFromArray(entityObject: T | IEntity, arrayAttribute: keyof T, values: T[keyof T]): Promise<T> {
    if (!entityObject) {
      throw Error("Cannot remove values from array: entityObject is undefined");
    }
    if (!arrayAttribute) {
      throw Error("Cannot remove values from array: arrayAttribute is undefined");
    }
    if (!Array.isArray(values)) {
      throw Error("Cannot remove values from array: values is not an array");
    }

    if (!values || values.length == 0) {
      console.warn("Cannot remove values from array: values is undefined or empty", entityObject, arrayAttribute, values);
      return entityObject as T;
    }

    let valuesToRemove = values as any[];

    let parseObject: Parse.Object;
    if ((entityObject as T).entity) {
      parseObject = (entityObject as T).entity as Parse.Object;
    } else {
      parseObject = entityObject as Parse.Object;
    }
    //fetching for consistency
    parseObject = await parseObject.fetch();

    let valuesToAdd = values as any[];

    //checking if values should be added as ParseObjects or not
    if (valuesToAdd.every(attribute => attribute instanceof Object && attribute.entity != undefined)) {
      valuesToAdd = valuesToAdd.map(x => x.entity) as Parse.Object[];
    } else if (valuesToAdd.some(x => x instanceof EntityObject || x instanceof EntityFile)) {
      throw Error("Cannot add values to array: values is a mix of EntityObjects and other types");
    } else {
      // if it's not entity objects, there is'nt much to do.
      // For example, if it were Parse.Object already, they can be simoply added to the array and they will be turned into pointers
    }

    // adding values to array
    valuesToAdd.forEach(element => {
      parseObject.remove(arrayAttribute as string, element);
    });

    return await parseObject.save().then((res) => {
      return this.mapParseAttributesToEntityObject(res) as T;
    });
  }

  public checkIfOfClass(entityObject: any){
    if(!entityObject)
      return false;
    if(entityObject instanceof Object){
      if((entityObject as T).entity){
        if((entityObject as T).entity.className == this.classname){
          return true;
        }
      }
    }
    return false;
  }
}